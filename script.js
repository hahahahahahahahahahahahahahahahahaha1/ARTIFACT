/* ==========================================================
   MULTI-ARTIST LOCALSTORAGE SYSTEM (UPGRADED)
========================================================== */

// Get all artists or return empty object
function loadArtists() {
  return JSON.parse(localStorage.getItem("artists") || "{}");
}

// Save artists back to storage
function saveArtists(data) {
  localStorage.setItem("artists", JSON.stringify(data));
}

// Get current user
function getCurrentUser() {
  return localStorage.getItem("currentUser");
}

// Get current artist object
function getArtistData() {
  const user = getCurrentUser();
  const artists = loadArtists();
  if (!user || !artists[user]) return null;
  return artists[user];
}

// Save changes to current artist only
function updateArtistData(callback) {
  const user = getCurrentUser();
  const artists = loadArtists();
  if (!user || !artists[user]) return;
  callback(artists[user]); 
  saveArtists(artists);
}

/* ==========================================================
   ARTIST PROFILE (profile.html)
========================================================== */

function loadProfile() {
  const artist = getArtistData();
  if (!artist) return alert("No artist logged in!");

  document.getElementById("artistName").value = artist.profile.name;
  document.getElementById("artistBio").value = artist.profile.bio;

  document.getElementById("profilePic").src =
    artist.profile.profilePic || "https://via.placeholder.com/200x200?text=Profile+Pic";
}

function saveProfile() {
  updateArtistData(artist => {
    artist.profile.name = document.getElementById("artistName").value;
    artist.profile.bio = document.getElementById("artistBio").value;
  });

  alert("Profile saved!");
}

function saveProfilePic() {
  const file = document.getElementById("profilePicInput").files[0];
  if (!file) return alert("Please choose an image first!");

  const reader = new FileReader();
  reader.onload = () => {
    updateArtistData(artist => {
      artist.profile.profilePic = reader.result;
    });

    document.getElementById("profilePic").src = reader.result;

    alert("Profile picture updated!");
  };

  reader.readAsDataURL(file);
}

/* ==========================================================
   ARTWORK UPLOAD + DELETE (upload.html)
   NOW SUPPORTS PNG/JPG + GLTF/GLB ONLY
========================================================== */

function addArtwork() {
  const file = document.getElementById("artInput").files[0];
  const title = document.getElementById("artTitle").value.trim();
  const desc = document.getElementById("artDesc").value.trim();

  if (!file) return alert("Select a file first!");
  if (!title) return alert("Enter artwork title!");

  const reader = new FileReader();

  reader.onload = () => {
    const ext = file.name.toLowerCase();

    updateArtistData(artist => {

      // IMAGES
      if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg")) {
        artist.artworks.push({
          type: "image",
          img: reader.result,
          model: null,
          format: "image",
          title,
          desc
        });
      }

      // GLTF / GLB ONLY
      else if (ext.endsWith(".gltf") || ext.endsWith(".glb")) {
        artist.artworks.push({
          type: "model",
          format: "gltf",
          img: null,
          model: reader.result,
          title,
          desc
        });
      }

      else {
        alert("Unsupported file! Allowed: PNG, JPG, JPEG, GLTF, GLB");
      }
    });

    displayArtworks();
  };

  reader.readAsDataURL(file);
}

function deleteArtwork(index) {
  updateArtistData(artist => {
    artist.artworks.splice(index, 1);
  });

  displayArtworks();
}

function displayArtworks() {
  const container = document.getElementById("artList");
  if (!container) return;

  const artist = getArtistData();
  if (!artist) return;

  container.innerHTML = "";

  artist.artworks.forEach((art, i) => {
    let preview = "";

    if (art.type === "image") {
      preview = `<img src="${art.img}">`;
    }

    else if (art.type === "model") {
      preview = `<div class="model-preview">[3D Model: GLTF/GLB]</div>`;
    }

    container.innerHTML += `
      <div class="card">
        ${preview}
        <p><strong>${art.title}</strong></p>
        <p>${art.desc}</p>
        <button onclick="deleteArtwork(${i})">Delete</button>
      </div>
    `;
  });
}

/* ==========================================================
   ARTIST PORTFOLIO (artist.html)
========================================================== */

function loadPortfolio() {
  const artist = getArtistData();
  if (!artist) return alert("No artist logged in!");

  document.getElementById("artistDisplayName").textContent =
    artist.profile.name || "Unnamed Artist";

  document.getElementById("artistDisplayBio").textContent =
    artist.profile.bio || "No biography available.";

  document.getElementById("artistPic").src =
    artist.profile.profilePic || "https://via.placeholder.com/200x200?text=Artist";

  const gallery = document.getElementById("artGallery");
  gallery.innerHTML = "";

  artist.artworks.forEach(art => {
    if (art.type === "image") {
      const el = document.createElement("img");
      el.src = art.img;
      gallery.appendChild(el);
    }

    else if (art.type === "model") {
      const el = document.createElement("div");
      el.textContent = "[3D Model (GLTF/GLB)]";
      gallery.appendChild(el);
    }
  });
}

/* ==========================================================
   AR VIEWER (ar.html)
   FIXED BLANK PLANE + GLTF ONLY + SMOOTHER AR
========================================================== */

let arIndex = 0;

function initAR() {
  const artist = getArtistData();
  if (!artist) return alert("No artist logged in!");

  const artworks = artist.artworks;
  const assets = document.getElementById("arAssets");
  const plane = document.getElementById("arPlane");
  const model = document.getElementById("arModel");

  const titleText = document.getElementById("arTitle");
  const descText = document.getElementById("arDesc");

  if (!assets || !plane || !model) return;

  assets.innerHTML = ""; // reset

  /* -------- LOAD ASSETS -------- */
  artworks.forEach((art, i) => {

    // IMAGE
    if (art.type === "image") {
      const img = document.createElement("img");
      img.id = "img-" + i;
      img.src = art.img;
      assets.appendChild(img);
    }

    // GLTF MODEL
    else if (art.type === "model" && art.format === "gltf") {
      const item = document.createElement("a-asset-item");
      item.id = "model-" + i;
      item.src = art.model;
      assets.appendChild(item);
    }
  });

  /* -------- UPDATE VIEW -------- */
  function updateAR() {
    const art = artworks[arIndex];

    titleText.setAttribute("value", art.title || "(Untitled)");
    descText.setAttribute("value", art.desc || "");

    /* IMAGE */
    if (art.type === "image") {
      plane.setAttribute("visible", true);
      plane.setAttribute("src", "#img-" + arIndex);

      model.setAttribute("visible", false);
      model.removeAttribute("gltf-model");
    }

    /* GLTF */
    else if (art.type === "model" && art.format === "gltf") {
      plane.setAttribute("visible", false);

      model.setAttribute("gltf-model", "#model-" + arIndex);
      model.setAttribute("visible", true);
    }
  }

  updateAR();

  document.getElementById("prevArt").onclick = () => {
    arIndex = (arIndex - 1 + artworks.length) % artworks.length;
    updateAR();
  };

  document.getElementById("nextArt").onclick = () => {
    arIndex = (arIndex + 1) % artworks.length;
    updateAR();
  };
}
