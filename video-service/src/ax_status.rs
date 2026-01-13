use dashmap::DashMap;
use std::sync::Arc;
use crate::TaskStatus;

pub type StatusMap = Arc<DashMap<String, TaskStatus>>;
