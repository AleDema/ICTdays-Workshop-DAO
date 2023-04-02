import { useEffect, useState, useRef } from 'react';
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


function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState();
  const [context, setContext] = useState(null);
  const [tick, setTick] = useState(true);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const renderCanvas = () => {
    // Draw the ImageData object onto the canvas
    if (matrix && context) {
      //var imageData = context.createImageData(1024, 1024);
      //let imageData = matrix;
      // console.log(imageData)
      // var imageData = context.createImageData(1024, 1024);
      for (var i = 0; i < matrix.data.length; i += 4) {
        // var x = (i / 4) % 1024;
        // var y = Math.floor(i / (4 * 1024));
        // let ran = Math.floor(Math.random() * 256);
        matrix.data[i] = 255; // Red channel
        matrix.data[i + 1] = count; // Green channel
        matrix.data[i + 2] = count; // Blue channel
        matrix.data[i + 3] = 255; // Alpha channel
      }
      context.putImageData(matrix, 0, 0);
      var pngImage = canvas.toDataURL("image/png");

      // // Display the PNG image
      imgRef.current.src = pngImage;
    }

  }

  useEffect(() => {
    var canvas = canvasRef.current
    canvas.width = 1024;
    canvas.height = 1024;
    var context = canvas.getContext("2d");
    setContext(context)

    var imageData = context.createImageData(1024, 1024);
    for (var i = 0; i < imageData.data.length; i += 4) {
      var x = (i / 4) % 1024;
      var y = Math.floor(i / (4 * 1024));
      let ran = Math.floor(Math.random() * 256);
      imageData.data[i] = ran; // Red channel
      imageData.data[i + 1] = ran; // Green channel
      imageData.data[i + 2] = ran; // Blue channel
      imageData.data[i + 3] = 255; // Alpha channel
    }

    setMatrix(imageData);
    //console.log(imageData);

    const loop = setInterval(() => {
      setTick(oltTick => oltTick != oltTick)
    }, 100)

    // const chnage = setInterval(() => {
    //   setTick(oltTick => oltTick != oltTick)
    // }, 100)

    // const updateSeed = setInterval(() => {
    //   setCount(prevSeed => Math.floor(Math.random() * 256));
    // }, 100)

    // const loop2 = setInterval(() => {
    //   setMatrix(oldMatrix => {
    //     oldMatrix.data[2] = 255;
    //     return oldMatrix;
    //   });
    // }, 2)

    return () => {
      clearInterval(loop);
      //clearInterval(loop2);
      //clearInterval(updateSeed);
    };
  }, []);

  useEffect(() => {
    renderCanvas();
  }, [tick]);

  return (
    <div className="App bg-gray-900 flex flex-col justify-center items-center">
      <canvas id="canvas" ref={canvasRef} className="m-3 container xl" width={1024} height={1024}></canvas>
      <img ref={imgRef}></img>
    </div>
  );
}

export default App;
