import { useEffect, useState, useRef } from 'react';
import Canvas from './components/Canvas';
import './index.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import reactLogo from './assets/react.svg';
import { backend } from './declarations/backend';

const pixel = {
  r: 0,
  g: 0,
  b: 0
}

// const canvas = document.getElementById("myCanvas");
// const ctx = canvas.getContext("2d");
// let scale = 1;
let translateX = 0;
let translateY = 0;

// canvas.addEventListener("wheel", function (event) {
//   event.preventDefault();
//   if (event.deltaY < 0) {
//     // zoom in
//     scale *= 1.1;
//   } else {
//     // zoom out
//     scale /= 1.1;
//   }
//   draw();
// });

// let isDragging = false;
// let lastX = 0;
// let lastY = 0;

// canvas.addEventListener("mousedown", function (event) {
//   isDragging = true;
//   lastX = event.clientX;
//   lastY = event.clientY;
// });

// canvas.addEventListener("mousemove", function (event) {
//   if (isDragging) {
//     const deltaX = event.clientX - lastX;
//     const deltaY = event.clientY - lastY;
//     translateX += deltaX / scale;
//     translateY += deltaY / scale;
//     lastX = event.clientX;
//     lastY = event.clientY;
//     draw();
//   }
// });

// canvas.addEventListener("mouseup", function (event) {
//   isDragging = false;
// });

// canvas.addEventListener("click", function (event) {
//   const x = event.clientX;
//   const y = event.clientY;
//   highlightPixel(x, y);
// });

// function draw() {
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   ctx.save();
//   ctx.scale(scale, scale);
//   ctx.translate(translateX, translateY);
//   // draw the canvas content here
//   ctx.restore();
// }

// function highlightPixel(x, y) {
//   const unscaledX = (x - translateX) / scale;
//   const unscaledY = (y - translateY) / scale;
//   const imageData = ctx.getImageData(unscaledX, unscaledY, 1, 1);
//   const pixel = imageData.data;

//   ctx.strokeStyle = "red";
//   ctx.strokeRect(unscaledX - 5, unscaledY - 5, 10, 10);
// }
const MAX_ZOOM = 5
const MIN_ZOOM = 0.1
const SCROLL_SENSITIVITY = 0.0005

function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState();
  const [context, setContext] = useState(null);
  const [tick, setTick] = useState(true);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const zoom = (e) => {
    //e.preventDefault();
    console.log("zoom event")
    let zoomAmount = e.deltaY * SCROLL_SENSITIVITY
    let cameraZoom = MIN_ZOOM;
    setScale(oldZoom => {
      cameraZoom = oldZoom + zoomAmount
      cameraZoom = Math.min(cameraZoom, MAX_ZOOM)
      cameraZoom = Math.max(cameraZoom, MIN_ZOOM)
      return cameraZoom
    })
  }



  const renderCanvas = () => {
    // Draw the ImageData object onto the canvas
    console.log("renderCanvas")
    if (matrix && context) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      context.save();
      context.scale(scale, scale);
      context.putImageData(matrix, 0, 0);
      context.restore();
      console.log(scale)
    }

  }

  useEffect(() => {
    var canvas = canvasRef.current
    canvas.width = 1024;
    canvas.height = 1024;
    var context = canvas.getContext("2d");
    setContext(context)
    // context.scale(scale, scale);
    var imageData = context.createImageData(canvas.width, canvas.height);
    for (var i = 0; i < imageData.data.length; i += 4) {
      var x = (i / 4) % canvas.width;
      var y = Math.floor(i / (4 * canvas.height));
      let ran = Math.floor(Math.random() * 256);
      let ran1 = Math.floor(Math.random() * 256);
      let ran2 = Math.floor(Math.random() * 256);
      imageData.data[i] = ran; // Red channel
      imageData.data[i + 1] = ran1; // Green channel
      imageData.data[i + 2] = ran2; // Blue channel
      imageData.data[i + 3] = 255; // Alpha channel
    }

    setMatrix(imageData);
    console.log(imageData);

    //setTick(oltTick => oltTick != oltTick)
  }, []);

  // useEffect(() => {
  //   renderCanvas();
  //   const wait = setInterval(() => {
  //     setTick(oldTick => oldTick = !oldTick)
  //   }, 100)

  //   return () => {
  //     clearInterval(wait);
  //   };
  // }, [tick]);

  useEffect(() => {
    renderCanvas();
  }, [zoom]);

  return (
    <div className="">
      <canvas className="hidden" id="canvas" ref={canvasRef} width={1024} height={1024} onWheel={zoom}></canvas>
      <Canvas canvasHeight={1024} canvasWidth={1024} />
    </div>
  );
}

export default App;
