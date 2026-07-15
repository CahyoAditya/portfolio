<h1> NAP - Portfolio </h1>

Personal portfolio website of **Aditya Cahyo Nugroho** (NIM M0403241109, IPB University Student), a game developer and pixel artist. Built using responsive vanilla HTML5 and CSS3, showcasing personal game titles and illustration work. Live demo is available at [cahyoaditya.github.io/portfolio](https://cahyoaditya.github.io/portfolio/).

# Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Setup](#setup)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Projects Showcased](#projects-showcased)
- [Aesthetic Reference](#aesthetic-reference)
- [Maintainers](#maintainers)
- [License](#license)

# Features

Key highlights of this website:
1. **Interactive Navigation**: Seamless navigation across sections (Home, About, Projects, and Contact) powered by smooth CSS scrolling.
2. **Neon & Dark Aesthetic**: Modern visual design featuring dynamic neon accents (cyberpunk shades of pink, purple, and deep blue).
3. **Responsive Grid**: Flexbox and CSS Grid layout for showcasing primary game titles and side-project thumbnails adaptively on all device screen sizes.
4. **Interactive UI Elements**: Custom button hover scaling, animated background elements, and text hover gradients.

# Setup

### 1. Clone the repository

```bash
git clone https://github.com/CahyoAditya/portfolio.git
cd portfolio
```

### 2. Prepare assets

Ensure all assets (logos, profile photo, project illustrations) are stored inside the `assets/` directory.

> [!TIP]
> Keep image files compressed for optimized web loading speeds and fast deployment times on GitHub Pages.

# Running Locally

Since this is a static webpage, you can open and run it directly without any build process:

### Double-Click
Open your file explorer and double-click `index.html` to run it directly in your web browser.

### Local Server (Recommended)
Running through an HTTP server is recommended for correct handling of local file paths and simulating a production environment.

- **Using Python:**
  ```bash
  python -m http.server 8000
  ```
  Open your browser and navigate to `http://localhost:8000`.

- **Using Node.js:**
  ```bash
  npx serve .
  ```
  Open the URL output in your terminal (typically `http://localhost:3000` or `http://localhost:5000`).

# Deployment

This project contains a GitHub Actions workflow to automate deployment to **GitHub Pages**.

- **Live URL**: [cahyoaditya.github.io/portfolio](https://cahyoaditya.github.io/portfolio/)

> [!IMPORTANT]
> The site is configured to automatically deploy every time a push is made to the `main` branch. 
> To monitor or manage deployments, check the **Actions** tab of your repository on GitHub.

# Project Structure

```
├── .github/
│   └── workflows/
│       └── static.yml    # GitHub Actions workflow for automatic deployment to Pages
├── assets/               # Local images, icons, and media files
│   ├── logo.ico          # Website browser tab icon
│   ├── logo.png          # Navbar logo icon
│   ├── profile.jpg       # Profile picture on main hero section
│   ├── project_1.png     # Thumbnail for Escaping Life
│   ├── project_2.jpeg    # Thumbnail for Bubble Virus 0
│   └── 3.png - 8.png     # Thumbnails for side projects & illustrations
├── index.html            # Main markup page & layout
├── style.css             # Stylesheet containing layout, fonts, variables, and keyframe animations
└── README.md             # Project documentation (this file)
```

# Projects Showcased

- **Main Project 1**: [149 Escaping Life (Student Denshatsu)](https://p-esc.itch.io/149-escaping-life-student-denshatsu) — Interactive game hosted on itch.io.
- **Main Project 2**: [Bubble Virus 0](https://globalgamejam.org/games/2025/bubble-virus-0) — Game submission for Global Game Jam 2025.
- **Side Projects**: Pixel art illustrations hosted on Instagram under [@atomicsart](https://www.instagram.com/atomicsart/).

# Aesthetic Reference

| Element | Specification |
| --- | --- |
| **Typography** | [Quicksand](https://fonts.google.com/specimen/Quicksand) via Google Fonts |
| **Primary Theme** | Dark Cyberpunk / Gaming theme |
| **Colors (CSS Variables)** | `--dark-blue`: `#110a33`<br>`--black`: `#000000`<br>`--pink`: `#F92C86`<br>`--purple`: `#5A54F8`<br>`--white`: `#FFFFFF` |

# Maintainers

- **Aditya Cahyo Nugroho** (NIM M0403241109) — IPB University Student
  - GitHub: [@CahyoAditya](https://github.com/CahyoAditya)
  - LinkedIn: [Aditya Cahyo Nugroho](https://www.linkedin.com/in/aditya-cahyo-nugroho-472878323/)
  - Instagram: [@adityacahyo_gns](https://www.instagram.com/adityacahyo_gns/)
  - Email: adityacahyo104@gmail.com

# License

This project is personal work and currently unlicensed. Feel free to explore and learn from it.
