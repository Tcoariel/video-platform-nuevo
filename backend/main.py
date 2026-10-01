import os
import hashlib
import uuid
import boto3

from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from db import create_db, get_session
from models import User, Video, Comment

app = FastAPI(title="Video Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

AWS_REGION = os.getenv("AWS_REGION")
VIDEOS_BUCKET = os.getenv("VIDEOS_BUCKET")
THUMBNAILS_BUCKET = os.getenv("THUMBNAILS_BUCKET")

s3 = boto3.client("s3", region_name=AWS_REGION)

@app.on_event("startup")
def startup():
    create_db()

def password(text):
    return hashlib.sha256(text.encode()).hexdigest()

@app.post("/users")
def register(name: str = Form(...), email: str = Form(...), password_: str = Form(...), db: Session = Depends(get_session)):
    if db.exec(select(User).where(User.email == email)).first():
        raise HTTPException(400, "El correo ya existe")
    user = User(name=name, email=email, password_hash=password(password_))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email}

@app.post("/login")
def login(email: str = Form(...), password_: str = Form(...), db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.email == email)).first()
    if not user or user.password_hash != password(password_):
        raise HTTPException(401, "Correo o contraseña incorrectos")
    return {"id": user.id, "name": user.name, "email": user.email}

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    videos = db.exec(select(Video).where(Video.user_id == user_id)).all()
    return {"id": user.id, "name": user.name, "email": user.email, "video_count": len(videos), "videos": videos}

@app.post("/videos")
def create_video(title: str = Form(...), description: str = Form(...), user_id: int = Form(...),
                 video: UploadFile = File(...), thumbnail: UploadFile = File(...),
                 db: Session = Depends(get_session)):
    if not video.filename.lower().endswith(".mp4"):
        raise HTTPException(400, "El video debe ser MP4")
    if not thumbnail.filename.lower().endswith((".jpg", ".jpeg", ".png")):
        raise HTTPException(400, "Miniatura inválida")

    video_key = str(uuid.uuid4()) + ".mp4"
    thumbnail_key = str(uuid.uuid4()) + "_" + thumbnail.filename

    s3.upload_fileobj(video.file, VIDEOS_BUCKET, video_key, ExtraArgs={"ContentType": "video/mp4"})
    s3.upload_fileobj(thumbnail.file, THUMBNAILS_BUCKET, thumbnail_key,
                      ExtraArgs={"ContentType": thumbnail.content_type})

    video_url = f"https://{VIDEOS_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{video_key}"
    thumbnail_url = f"https://{THUMBNAILS_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{thumbnail_key}"

    new_video = Video(title=title, description=description, video_url=video_url,
                      thumbnail_url=thumbnail_url, user_id=user_id)
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@app.get("/videos")
def get_videos(db: Session = Depends(get_session)):
    result = []
    for video in db.exec(select(Video)).all():
        user = db.get(User, video.user_id)
        result.append({
            "id": video.id, "title": video.title, "description": video.description,
            "video_url": video.video_url, "thumbnail_url": video.thumbnail_url,
            "views": video.views, "user_id": video.user_id, "user_name": user.name,
            "created_at": video.created_at
        })
    return result

@app.get("/videos/{video_id}")
def get_video(video_id: int, db: Session = Depends(get_session)):
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video no encontrado")
    video.views += 1
    db.commit()
    db.refresh(video)
    user = db.get(User, video.user_id)
    return {
        "id": video.id, "title": video.title, "description": video.description,
        "video_url": video.video_url, "thumbnail_url": video.thumbnail_url,
        "views": video.views, "user_id": video.user_id, "user_name": user.name,
        "created_at": video.created_at
    }

@app.put("/videos/{video_id}")
def update_video(video_id: int, title: str = Form(...), description: str = Form(...),
                 db: Session = Depends(get_session)):
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video no encontrado")
    video.title = title
    video.description = description
    db.commit()
    db.refresh(video)
    return video

@app.delete("/videos/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_session)):
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video no encontrado")
    db.delete(video)
    db.commit()
    return {"message": "Video eliminado"}

@app.post("/videos/{video_id}/comments")
def create_comment(video_id: int, content: str = Form(...), user_id: int = Form(...),
                   db: Session = Depends(get_session)):
    if not db.get(Video, video_id):
        raise HTTPException(404, "Video no encontrado")
    comment = Comment(content=content, user_id=user_id, video_id=video_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@app.get("/videos/{video_id}/comments")
def get_comments(video_id: int, db: Session = Depends(get_session)):
    comments = db.exec(select(Comment).where(Comment.video_id == video_id)).all()
    result = []
    for comment in comments:
        user = db.get(User, comment.user_id)
        result.append({
            "id": comment.id, "content": comment.content,
            "user_name": user.name, "created_at": comment.created_at
        })
    return result
