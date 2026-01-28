-- Supabase Database Schema Migration
-- Generated from SQLAlchemy models for Montage application

-- Enable UUID extension (useful for future features)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS reposts CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS views CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (renamed from "users" to "User" to match SDK usage)
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR,
    google_id VARCHAR UNIQUE,
    role VARCHAR DEFAULT 'user' NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_onboarded BOOLEAN DEFAULT FALSE,
    profile_pic VARCHAR DEFAULT 'http://localhost:8000/static/defaults/default_avatar.png',
    flash_uploads INTEGER DEFAULT 0,
    home_uploads INTEGER DEFAULT 0,
    bio VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for User table
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_google_id ON "User"(google_id);

-- Verification Codes table
CREATE TABLE "VerificationCode" (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL,
    code VARCHAR NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verification_email ON "VerificationCode"(email);

-- Videos table
CREATE TABLE "Video" (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    video_url VARCHAR NOT NULL,
    url_480p VARCHAR,
    url_720p VARCHAR,
    url_1080p VARCHAR,
    url_2k VARCHAR,
    url_4k VARCHAR,
    thumbnail_url VARCHAR NOT NULL,
    video_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    owner_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    earnings DECIMAL(10, 2) DEFAULT 0.0,
    shares INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    processing_key VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_video_owner ON "Video"(owner_id);
CREATE INDEX idx_video_type ON "Video"(video_type);
CREATE INDEX idx_video_status ON "Video"(status);
CREATE INDEX idx_video_created ON "Video"(created_at DESC);

-- Views table (for tracking video views)
CREATE TABLE "View" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "User"(id) ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES "Video"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_view_user ON "View"(user_id);
CREATE INDEX idx_view_video ON "View"(video_id);
CREATE INDEX idx_view_created ON "View"(created_at);

-- Likes table (composite primary key)
CREATE TABLE "Like" (
    user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES "Video"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
);

CREATE INDEX idx_like_video ON "Like"(video_id);

-- Posts table
CREATE TABLE "Post" (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    image_url VARCHAR,
    owner_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_post_owner ON "Post"(owner_id);
CREATE INDEX idx_post_created ON "Post"(created_at DESC);

-- Comments table
CREATE TABLE "Comment" (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    video_id INTEGER NOT NULL REFERENCES "Video"(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comment_video ON "Comment"(video_id);
CREATE INDEX idx_comment_owner ON "Comment"(owner_id);
CREATE INDEX idx_comment_created ON "Comment"(created_at DESC);

-- Follows table (composite primary key)
CREATE TABLE "Follow" (
    follower_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    followed_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id != followed_id)
);

CREATE INDEX idx_follow_follower ON "Follow"(follower_id);
CREATE INDEX idx_follow_followed ON "Follow"(followed_id);

-- Reposts table
CREATE TABLE "Repost" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES "Video"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_repost_user ON "Repost"(user_id);
CREATE INDEX idx_repost_video ON "Repost"(video_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "View" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Repost" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (you can customize these based on your needs)
-- For now, allowing all operations via service role key (which your backend uses)

-- User policies
CREATE POLICY "Allow all for service role" ON "User" FOR ALL USING (true);

-- VerificationCode policies
CREATE POLICY "Allow all for service role" ON "VerificationCode" FOR ALL USING (true);

-- Video policies
CREATE POLICY "Allow all for service role" ON "Video" FOR ALL USING (true);

-- View policies
CREATE POLICY "Allow all for service role" ON "View" FOR ALL USING (true);

-- Like policies
CREATE POLICY "Allow all for service role" ON "Like" FOR ALL USING (true);

-- Post policies
CREATE POLICY "Allow all for service role" ON "Post" FOR ALL USING (true);

-- Comment policies
CREATE POLICY "Allow all for service role" ON "Comment" FOR ALL USING (true);

-- Follow policies
CREATE POLICY "Allow all for service role" ON "Follow" FOR ALL USING (true);

-- Repost policies
CREATE POLICY "Allow all for service role" ON "Repost" FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Montage database schema created successfully!';
    RAISE NOTICE 'Tables created: User, VerificationCode, Video, View, Like, Post, Comment, Follow, Repost';
END $$;
