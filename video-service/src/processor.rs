use std::process::Command;
use anyhow::{Result, anyhow};
use crate::ax_status::StatusMap;
use crate::TaskStatus;


pub async fn process(video_path: &str, format: &str, skip_thumbnail: bool, status_map: Option<StatusMap>, task_id: String) -> Result<()> {
    // 1. Validate Aspect Ratio via ffprobe
    let aspect_ratio = get_aspect_ratio(video_path).await?;
    validate_format(aspect_ratio, format)?;

    // 2. Transcode and Generate Thumbnail
    // Resolutions: 480p, 720p, 1080p, 1440p (2K), 2160p (4K)
    let resolutions = [480, 720, 1080, 1440, 2160];
    let total_steps = resolutions.len() + (if skip_thumbnail { 0 } else { 1 });
    
    for (i, height) in resolutions.iter().enumerate() {
        if let Some(ref map) = status_map {
            map.insert(task_id.clone(), TaskStatus {
                progress: ((i as f32 / total_steps as f32) * 100.0) as u32,
                status: "processing".to_string(),
                message: format!("Transcoding to {}p...", height),
            });
        }

        let output_path = format!("{}_{}p.mp4", video_path, height);
        transcode(video_path, &output_path, *height).await?;
    }

    // Generate thumbnail from the original source for best quality
    if !skip_thumbnail {
        if let Some(ref map) = status_map {
            map.insert(task_id.clone(), TaskStatus {
                progress: ((resolutions.len() as f32 / total_steps as f32) * 100.0) as u32,
                status: "processing".to_string(),
                message: "Generating thumbnail...".to_string(),
            });
        }
        generate_thumbnail(video_path).await?;
    }

    Ok(())
}

async fn get_aspect_ratio(video_path: &str) -> Result<f32> {
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
    
    Ok(width / height)
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
