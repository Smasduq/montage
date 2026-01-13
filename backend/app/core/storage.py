import boto3
from botocore.exceptions import NoCredentialsError
from app.core import config
import os

class S3Client:
    def __init__(self):
        self.bucket_name = config.S3_BUCKET_NAME
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
            region_name=config.AWS_REGION,
            endpoint_url=config.S3_ENDPOINT_URL if config.S3_ENDPOINT_URL else None
        )

    def _get_file_url(self, object_name):
        if config.S3_ENDPOINT_URL:
            # Handle Backblaze B2 specific URL construction
            if "backblazeb2.com" in config.S3_ENDPOINT_URL:
                endpoint_domain = config.S3_ENDPOINT_URL.replace("https://", "").replace("http://", "")
                return f"https://{self.bucket_name}.{endpoint_domain}/{object_name}"
            
            # Fallback for other custom endpoints (path style assumption or simple append)
            return f"{config.S3_ENDPOINT_URL}/{self.bucket_name}/{object_name}"
        
        # Standard AWS S3 URL
        return f"https://{self.bucket_name}.s3.{config.AWS_REGION}.amazonaws.com/{object_name}"

    def upload_file(self, file_path, object_name, content_type=None):
        """Upload a file to an S3 bucket"""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3.upload_file(file_path, self.bucket_name, object_name, ExtraArgs=extra_args)
            return self._get_file_url(object_name)
        except Exception as e:
            print(f"S3 Upload Error: {e}")
            return None

    def upload_fileobj(self, file_obj, object_name, content_type=None):
        """Upload a file object to an S3 bucket"""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            self.s3.upload_fileobj(file_obj, self.bucket_name, object_name, ExtraArgs=extra_args)
            return self._get_file_url(object_name)
        except Exception as e:
            print(f"S3 Upload Error: {e}")
            return None

s3_client = S3Client()
