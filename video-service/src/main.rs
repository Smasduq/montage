use ax_status::StatusMap;
use std::sync::Arc;
use axum::{
    routing::{post, get},
    extract::{Json, Path, State}, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

mod processor;
mod ax_status;

#[derive(Serialize, Deserialize)]
struct ProcessRequest {
    video_id: String,
    task_id: String, // Unique identifier for status tracking
    target_format: String, // "home" or "flash"
    #[serde(default)]
    skip_thumbnail: bool,
}

#[derive(Serialize)]
struct ProcessResponse {
    status: String,
    message: String,
    task_id: String,
}

#[derive(Serialize, Clone)]
pub struct TaskStatus {
    pub progress: u32,
    pub status: String,
    pub message: String,
}

struct AppState {
    status_map: StatusMap,
}

#[tokio::main]
async fn main() {
    let status_map = Arc::new(dashmap::DashMap::new());
    let state = Arc::new(AppState { status_map });

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/process", post(process_video))
        .route("/status/:task_id", get(get_status))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    println!("Video Service listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn process_video(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ProcessRequest>
) -> Json<ProcessResponse> {
    let task_id = payload.task_id.clone();
    let status_map = state.status_map.clone();
    
    println!("Processing video {} (task: {}) for format {}", payload.video_id, task_id, payload.target_format);
    
    status_map.insert(task_id.clone(), TaskStatus {
        progress: 0,
        status: "starting".to_string(),
        message: "Starting processing...".to_string(),
    });

    // Run in background
    let task_id_clone = task_id.clone();
    tokio::spawn(async move {
        match processor::process(&payload.video_id, &payload.target_format, payload.skip_thumbnail, Some(status_map.clone()), task_id_clone.clone()).await {
            Ok(_) => {
                status_map.insert(task_id_clone, TaskStatus {
                    progress: 100,
                    status: "completed".to_string(),
                    message: "Processing completed".to_string(),
                });
            },
            Err(e) => {
                status_map.insert(task_id_clone, TaskStatus {
                    progress: 0,
                    status: "error".to_string(),
                    message: e.to_string(),
                });
            },
        }
    });

    Json(ProcessResponse {
        status: "accepted".to_string(),
        message: "Processing started in background".to_string(),
        task_id,
    })
}

async fn get_status(
    State(state): State<Arc<AppState>>,
    Path(task_id): Path<String>
) -> Json<Option<TaskStatus>> {
    Json(state.status_map.get(&task_id).map(|s| s.value().clone()))
}

