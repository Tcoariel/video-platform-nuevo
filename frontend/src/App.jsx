import { useEffect, useState } from "react";

const API = "http://18.119.106.135:8000";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (user) {
      setPage("home");
      loadVideos();
    }
  }, []);

  async function loadVideos() {
    const res = await fetch(`${API}/videos`);
    setVideos(await res.json());
  }

  function logout() {
    localStorage.removeItem("user");
    setUser(null);
    setPage("login");
  }

  async function openVideo(id) {
    const res = await fetch(`${API}/videos/${id}`);
    setSelectedVideo(await res.json());

    const commentsRes = await fetch(`${API}/videos/${id}/comments`);
    setComments(await commentsRes.json());

    setPage("video");
  }

  if (!user) {
    return <Login setUser={setUser} setPage={setPage} />;
  }

  return (
    <>
      <header>
        <h1 onClick={() => setPage("home")}>YouTube</h1>

        <nav>
          <button onClick={() => setPage("home")}>Inicio</button>
          <button onClick={() => setPage("profile")}>Perfil</button>
          <button onClick={logout}>Salir</button>
        </nav>
      </header>

      {page === "home" && (
        <Home videos={videos} openVideo={openVideo} />
      )}

      {page === "video" && (
        <VideoPage
          video={selectedVideo}
          videos={videos}
          comments={comments}
          user={user}
          openVideo={openVideo}
          setComments={setComments}
        />
      )}

      {page === "profile" && (
        <Profile
          user={user}
          videos={videos}
          loadVideos={loadVideos}
          openVideo={openVideo}
        />
      )}
    </>
  );
}

function Login({ setUser, setPage }) {
  const [register, setRegister] = useState(false);

  async function submit(e) {
    e.preventDefault();

    const form = new FormData(e.target);

    const res = await fetch(
      register ? `${API}/users` : `${API}/login`,
      {
        method: "POST",
        body: form
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail);
      return;
    }

    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    setPage("home");
  }

  return (
    <div className="login">
      <h1>YouTube</h1>

      <h2>{register ? "Crear cuenta" : "Iniciar sesion"}</h2>

      <form onSubmit={submit}>
        {register && (
          <input
            name="name"
            placeholder="Nombre"
            required
          />
        )}

        <input
          name="email"
          type="email"
          placeholder="Correo"
          required
        />

        <input
          name="password_"
          type="password"
          placeholder="Contrasena"
          required
        />

        <button type="submit">
          {register ? "Registrarse" : "Entrar"}
        </button>
      </form>

      <button onClick={() => setRegister(!register)}>
        {register ? "Ya tengo una cuenta" : "Crear una cuenta"}
      </button>
    </div>
  );
}

function Home({ videos, openVideo }) {
  return (
    <main>
      <h2>Videos</h2>

      <div className="grid">
        {videos.map((video) => (
          <div
            className="card"
            key={video.id}
            onClick={() => openVideo(video.id)}
          >
            <img
              src={video.thumbnail_url}
              alt={video.title}
            />

            <h3>{video.title}</h3>
            <p>{video.user_name}</p>
            <p>{video.views} vistas</p>
            <p>
              {new Date(video.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}

function VideoPage({
  video,
  videos,
  comments,
  user,
  openVideo,
  setComments
}) {
  if (!video) {
    return null;
  }

  async function sendComment(e) {
    e.preventDefault();

    const form = new FormData(e.target);
    form.append("user_id", user.id);

    await fetch(
      `${API}/videos/${video.id}/comments`,
      {
        method: "POST",
        body: form
      }
    );

    e.target.reset();

    const res = await fetch(
      `${API}/videos/${video.id}/comments`
    );

    setComments(await res.json());
  }

  return (
    <main>
      <video
        className="player"
        src={video.video_url}
        controls
        autoPlay
      />

      <h2>{video.title}</h2>

      <p>{video.description}</p>

      <p>
        {video.user_name} · {video.views} vistas
      </p>

      <h3>Comentarios</h3>

      <form onSubmit={sendComment}>
        <input
          name="content"
          placeholder="Escribe un comentario"
          required
        />

        <button type="submit">
          Comentar
        </button>
      </form>

      {comments.map((comment) => (
        <div className="comment" key={comment.id}>
          <b>{comment.user_name}</b>
          <p>{comment.content}</p>
        </div>
      ))}

      <h3>Videos recomendados</h3>

      <div className="recommended">
        {videos
          .filter((v) => v.id !== video.id)
          .map((v) => (
            <div
              key={v.id}
              onClick={() => openVideo(v.id)}
            >
              <img
                src={v.thumbnail_url}
                alt={v.title}
              />

              <p>{v.title}</p>
            </div>
          ))}
      </div>
    </main>
  );
}

function Profile({
  user,
  videos,
  loadVideos,
  openVideo
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);

  const myVideos = videos.filter(
    (v) => v.user_id === user.id
  );

  async function upload(e) {
    e.preventDefault();

    const form = new FormData();

    form.append("title", title);
    form.append("description", description);
    form.append("user_id", user.id);
    form.append("video", video);
    form.append("thumbnail", thumbnail);

    const res = await fetch(
      `${API}/videos`,
      {
        method: "POST",
        body: form
      }
    );

    if (!res.ok) {
      const data = await res.json();
      alert(data.detail);
      return;
    }

    setTitle("");
    setDescription("");
    setVideo(null);
    setThumbnail(null);

    await loadVideos();

    alert("Video publicado");
  }

  async function deleteVideo(id) {
    if (!confirm("Eliminar video?")) {
      return;
    }

    await fetch(
      `${API}/videos/${id}`,
      {
        method: "DELETE"
      }
    );

    loadVideos();
  }

  async function editVideo(
    id,
    oldTitle,
    oldDescription
  ) {
    const title = prompt("Nuevo titulo", oldTitle);

    if (title === null) {
      return;
    }

    const description = prompt(
      "Nueva descripcion",
      oldDescription
    );

    if (description === null) {
      return;
    }

    const form = new FormData();

    form.append("title", title);
    form.append("description", description);

    await fetch(
      `${API}/videos/${id}`,
      {
        method: "PUT",
        body: form
      }
    );

    loadVideos();
  }

  return (
    <main>
      <h2>Mi perfil</h2>

      <p>Nombre: {user.name}</p>
      <p>Correo: {user.email}</p>
      <p>Videos publicados: {myVideos.length}</p>

      <hr />

      <h2>Publicar video</h2>

      <form onSubmit={upload}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo"
          required
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion"
          required
        />

        <label>
          <b>Video (MP4)</b>

          <input
            type="file"
            accept=".mp4"
            onChange={(e) => setVideo(e.target.files[0])}
            required
          />
        </label>

        <label>
          <b>Portada / Miniatura (JPG, JPEG o PNG)</b>

          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={(e) => setThumbnail(e.target.files[0])}
            required
          />
        </label>

        <button type="submit">
          Publicar
        </button>
      </form>

      <hr />

      <h2>Mis videos</h2>

      {myVideos.map((v) => (
        <div className="my-video" key={v.id}>
          <img
            src={v.thumbnail_url}
            alt={v.title}
          />

          <div>
            <h3>{v.title}</h3>

            <button onClick={() => openVideo(v.id)}>
              Ver
            </button>

            <button
              onClick={() =>
                editVideo(
                  v.id,
                  v.title,
                  v.description
                )
              }
            >
              Editar
            </button>

            <button
              onClick={() => deleteVideo(v.id)}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}

export default App;