use std::process::Command;
use anyhow::{Result, anyhow};
use crate::ax_status::StatusMap;
use crate::TaskStatus;


pub async fn process(video_path: &str, format: &str, skip_thumbnail: bool, status_map: Option<StatusMap>, task_id: String) -> Result<()> {
    // 1. Get Dimensions and Aspect Ratio
    let (width, height) = get_video_dimensions(video_path).await?;
    let aspect_ratio = width / height;
    
    validate_format(aspect_ratio, format)?;

    // 2. Transcode and Generate Thumbnail
    if format == "flash" {
        // For flash videos, skip multi-resolution transcoding.
        // Copy original to a standard resolution (720p) so the backend finds it easily.
        // Optimization: Use original if it is small, or just standard 720p? 
        // Logic: Keep existing 720p copy for simplicity, flash is vertical usually.
        
        if let Some(ref map) = status_map {
            map.insert(task_id.clone(), TaskStatus {
                progress: 50,
                status: "processing".to_string(),
                message: "Optimizing flash video (copy)...".to_string(),
            });
        }
        let output_path = format!("{}_720p.mp4", video_path);
        std::fs::copy(video_path, &output_path)?;
    } else {
        // Resolutions: 480p, 720p, 1080p, 1440p (2K), 2160p (4K)
        let all_resolutions = [480, 720, 1080, 1440, 2160];
        
        // Filter resolutions: strictly less than or equal to source height
        // But always include at least one resolution (e.g. if source is 360p, we might want to just keep original or strict 480p? 
        // For now, let's generate all resolutions <= source_height.
        // If source is 1080p, we generate 480, 720, 1080.
        // If source is 720p, we generate 480, 720.
        // If source is < 480p (e.g. 360p), we might end up with nothing? 
        // Let's ensure we at least try to Transcode to the nearest standard if logical, or maybe just copy original as "video_url" fallback.
        // The backend logic picks 720p or 1080p or 480p. If none exist, it might fail.
        // Let's ensure we generate 480p even if source is smaller? Or simpler:
        // Use the resolution list, but if target > source, skip it.
        
        let mut target_resolutions: Vec<i32> = all_resolutions.into_iter()
            .filter(|&r| r as f32 <= height)
            .collect();

        // Edge case: if source height is large (e.g. 1085), 1080 is included.
        // Edge case: if source is small (e.g. 360), vector is empty.
        // If empty, let's force 480p so we have at least one playable format, or potentially just 480p as a baseline.
        if target_resolutions.is_empty() {
            target_resolutions.push(480);
        }

        let total_steps = target_resolutions.len() + (if skip_thumbnail { 0 } else { 1 });
        
        for (i, target_height) in target_resolutions.iter().enumerate() {
            if let Some(ref map) = status_map {
                map.insert(task_id.clone(), TaskStatus {
                    progress: ((i as f32 / total_steps as f32) * 100.0) as u32,
                    status: "processing".to_string(),
                    message: format!("Transcoding to {}p...", target_height),
                });
            }

            let output_path = format!("{}_{}p.mp4", video_path, target_height);
            transcode(video_path, &output_path, *target_height).await?;
        }
    }

    // Generate thumbnail from the original source for best quality
    if !skip_thumbnail {
        if let Some(ref map) = status_map {
            let progress = if format == "flash" { 90 } else { 95 };
            map.insert(task_id.clone(), TaskStatus {
                progress: progress,
                status: "processing".to_string(),
                message: "Generating thumbnail...".to_string(),
            });
        }
        generate_thumbnail(video_path).await?;
    }

    Ok(())
}

async fn get_video_dimensions(video_path: &str) -> Result<(f32, f32)> {
    let output = Command::new("ffprobe")
        .args(&[
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=s=x:p=0",
            video_path,
        ])
        .output()?;

    if !output.status.success() {
        return Err(anyhow!("ffprobe failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let s = String::from_utf8(output.stdout)?;
    let parts: Vec<&str> = s.trim().split('x').collect();
    if parts.len() != 2 {
        return Err(anyhow!("Invalid ffprobe output: {}", s));
    }

    let width: f32 = parts[0].parse()?;
    let height: f32 = parts[1].parse()?;
    
    Ok((width, height))
}

fn validate_format(ratio: f32, target: &str) -> Result<()> {
    match target {
        "home" => {
            if ratio < 1.0 { return Err(anyhow!("Invalid aspect ratio for Home (Horizontal expected)")); }
        }
        "flash" => {
            if ratio > 1.0 { return Err(anyhow!("Invalid aspect ratio for Flash (Vertical expected)")); }
        }
        _ => return Err(anyhow!("Unknown format")),
    }
    Ok(())
}

async fn transcode(input: &str, output: &str, height: i32) -> Result<()> {
    println!("Transcoding {} to {}p -> {}", input, height, output);
    
    // Scale filter: -2 ensures width is calculated to maintain aspect ratio, divisible by 2
    let scale_filter = format!("scale=-2:{}", height);

    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input,
            "-vf", &scale_filter,
            "-vcodec", "libx264",
            "-crf", "28", // Lower quality for storage optimization
            "-preset", "faster", // Faster processing
            "-y", // Overwrite output
            output,
        ])
        .status()?;

    if !status.success() {
        return Err(anyhow!("ffmpeg transcoding to {}p failed", height));
    }
    Ok(())
}

async fn generate_thumbnail(video_path: &str) -> Result<()> {
    let thumb_path = format!("{}.jpg", video_path);
    println!("Generating thumbnail for {}", video_path);
    let status = Command::new("ffmpeg")
        .args(&[
            "-i", video_path,
            "-ss", "00:00:01",
            "-vframes", "1",
            "-q:v", "2",
            "-y",
            &thumb_path,
        ])
        .status()?;

    if !status.success() {
        return Err(anyhow!("ffmpeg thumbnail generation failed"));
    }
    Ok(())
}
