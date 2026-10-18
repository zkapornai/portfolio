/*
  Shared project data for the Home page (first 3 projects, full-screen) and the Projects page (cards).
  Edit this file to change the projects in both places.

  name     project title
  roles    small pills shown on the card (always visible on touch screens)
  desc     short description (Home page, first 3 projects)
  video    optional silent looping video shown on the Projects card
  playbackRate optional playback speed for the Projects card video
  poster   optional still image shown before the card video loads
  landing  optional image for the full-screen panel on the Home page ONLY, e.g. 'assets/my-project-landing.jpg'
           (the Projects page never uses it)
  landingVideo  optional film for the Home page panel; scroll progress scrubs the film and `landing` is the fallback.
  href     link to the project's standalone article page
*/
const PROJECTS = [
  {
    name: 'Faux Feels',
    roles: ['Pseudo Haptics', 'JavaScript', 'HTML', 'Sensory Design'],
    desc: 'Prototypes that give flat screens a sense of weight, resistance and texture.',
    video: 'assets/felt-interfaces.mp4',
    landing: 'assets/felt-interfaces-landing.jpg',
    landingVideo: 'assets/felt-interfaces-landing.mp4',
    href: 'felt-interfaces.html'
  },
  {
    name: 'Cutting Edge',
    roles: ['Product Design', 'Paper Engineering', 'Physical Prototyping'],
    desc: 'A full-scale paper recreation of an everyday charger, built through measuring, layered card, laser cutting and hands-on refinement.',
    img: 'paperPrototype/F20.jpg',
    video: 'assets/cutting-edge.mp4',
    playbackRate: 0.606,
    poster: 'paperPrototype/F20.jpg',
    landingVideo: 'assets/cutting-edge.mp4',
    href: 'cuttingEdge.html'
  },
  {
    name: 'CAD Cylinder',
    roles: ['Product Design', '3D Modelling', 'Screw CAD'],
    desc: 'A transparent, waterproof cup-and-lid prototype developed through iterative thread design and print testing.',
    video: 'assets/davinci_photorealistic_3d_printed_waterproof_cylinder_anim.mp4',
    landingVideo: 'assets/cylinder-landing-1440.mp4',
    poster: 'assets/Cylinderfiles/cylinder.png',
    href: 'cylinder.html'
  },
  {
    name: 'Tiny Instruments',
    roles: ['Physical Computing', 'Sound Design', 'Prototyping'],
    desc: 'Small interactive objects that turn simple gestures into playful sound.',
    href: 'tiny-instruments.html'
  },
  {
    name: 'Orbit',
    roles: ['Creative Direction', 'WebGL', '3D'],
    desc: 'A browser-based exploration of movement, form and spatial interaction.',
    href: 'orbit.html'
  },
  {
    name: 'Paper Weather',
    roles: ['UI Design', 'Data Visualisation', 'Front-end'],
    desc: 'A visual interface that gives changing weather data a softer, more human feel.',
    href: 'paper-weather.html'
  },
  {
    name: 'Quiet Hours',
    roles: ['App Design', 'Sound Design'],
    desc: 'A considered space for building calmer routines through sound and gentle prompts.',
    href: 'quiet-hours.html'
  },
  {
    name: 'Loop Studio',
    roles: ['Branding', 'Web Development', 'Motion Design'],
    desc: 'A visual identity and website shaped by a continuous, expressive motion language.',
    href: 'loop-studio.html'
  },
  {
    name: 'Linear to Circular',
    roles: ['Mechanical Design', '3D Modelling', 'Prototyping'],
    desc: 'A quick-and-dirty mechanical prototype linking rotary levers to a slider to convert circular motion into linear movement.',
    img: 'Linertocircular/LTC20.jpeg',
    href: 'linear-to-circular.html'
  }
];

const ARROW =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
  '<path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

/* Art tile: grey pattern placeholder (a1..a6) or a real image when `img` is set */
const artTile = (p, i) => {
  const imageStyle = p.img
    ? ` style="background:url('${p.img}') center/cover no-repeat"`
    : '';

  return `<i class="art a${i % 6 + 1}"${imageStyle}></i>`;
};