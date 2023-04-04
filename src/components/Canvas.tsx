import {
    useEffect,
    useCallback,
    useLayoutEffect,
    useRef,
    useState
} from "react";
import * as React from "react";

type CanvasProps = {
    canvasWidth: number;
    canvasHeight: number;
};

type Point = {
    x: number;
    y: number;
};

const ORIGIN = Object.freeze({ x: 0, y: 0 });

// adjust to device to avoid blur
const { devicePixelRatio: ratio = 1 } = window;

function diffPoints(p1: Point, p2: Point) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function addPoints(p1: Point, p2: Point) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

function scalePoint(p1: Point, scale: number) {
    return { x: p1.x / scale, y: p1.y / scale };
}

const ZOOM_SENSITIVITY = 500; // bigger for lower zoom per scroll

export default function Canvas(props: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [scale, setScale] = useState<number>(1);
    const [offset, setOffset] = useState<Point>(ORIGIN);
    const [mousePos, setMousePos] = useState<Point>(ORIGIN);
    const [viewportTopLeft, setViewportTopLeft] = useState<Point>(ORIGIN);
    const isResetRef = useRef<boolean>(false);
    const lastMousePosRef = useRef<Point>(ORIGIN);
    const lastOffsetRef = useRef<Point>(ORIGIN);

    // update last offset
    useEffect(() => {
        lastOffsetRef.current = offset;
    }, [offset]);

    // reset
    const reset = useCallback(
        (context: CanvasRenderingContext2D) => {
            if (context && !isResetRef.current) {
                // adjust for device pixel density
                context.canvas.width = props.canvasWidth * ratio;
                context.canvas.height = props.canvasHeight * ratio;
                context.scale(ratio, ratio);
                setScale(1);

                // reset state and refs
                setContext(context);
                setOffset(ORIGIN);
                setMousePos(ORIGIN);
                setViewportTopLeft(ORIGIN);
                lastOffsetRef.current = ORIGIN;
                lastMousePosRef.current = ORIGIN;

                // this thing is so multiple resets in a row don't clear canvas
                isResetRef.current = true;
            }
        },
        [props.canvasWidth, props.canvasHeight]
    );

    // functions for panning
    const mouseMove = useCallback(
        (event: MouseEvent) => {
            if (context) {
                const lastMousePos = lastMousePosRef.current;
                const currentMousePos = { x: event.pageX, y: event.pageY }; // use document so can pan off element
                lastMousePosRef.current = currentMousePos;

                const mouseDiff = diffPoints(currentMousePos, lastMousePos);
                setOffset((prevOffset) => addPoints(prevOffset, mouseDiff));
            }
        },
        [context]
    );

    const mouseUp = useCallback(() => {
        document.removeEventListener("mousemove", mouseMove);
        document.removeEventListener("mouseup", mouseUp);
    }, [mouseMove]);

    const startPan = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
            document.addEventListener("mousemove", mouseMove);
            document.addEventListener("mouseup", mouseUp);
            lastMousePosRef.current = { x: event.pageX, y: event.pageY };
        },
        [mouseMove, mouseUp]
    );

    // setup canvas and set context
    useLayoutEffect(() => {
        if (canvasRef.current) {
            // get new drawing context
            const renderCtx = canvasRef.current.getContext("2d");

            if (renderCtx) {
                reset(renderCtx);
            }
        }
    }, [reset, props.canvasHeight, props.canvasWidth]);

    // pan when offset or scale changes
    useLayoutEffect(() => {
        if (context && lastOffsetRef.current) {
            const offsetDiff = scalePoint(
                diffPoints(offset, lastOffsetRef.current),
                scale
            );
            context.translate(offsetDiff.x, offsetDiff.y);
            setViewportTopLeft((prevVal) => diffPoints(prevVal, offsetDiff));
            isResetRef.current = false;
        }
    }, [context, offset, scale]);

    // draw
    useLayoutEffect(() => {
        if (context) {
            const squareSize = 20;

            // clear canvas but maintain transform
            const storedTransform = context.getTransform();
            context.canvas.width = context.canvas.width;
            context.setTransform(storedTransform);

            var imageData = context.createImageData(context.canvas.width, context.canvas.height);
            for (var i = 0; i < imageData.data.length; i += 4) {
                var x = (i / 4) % context.canvas.width;
                var y = Math.floor(i / (4 * context.canvas.height));
                let ran = Math.floor(Math.random() * 256);
                let ran1 = Math.floor(Math.random() * 256);
                let ran2 = Math.floor(Math.random() * 256);
                imageData.data[i] = ran; // Red channel
                imageData.data[i + 1] = ran1; // Green channel
                imageData.data[i + 2] = ran2; // Blue channel
                imageData.data[i + 3] = 255; // Alpha channel
            }

            context.putImageData(imageData, 0, 0);

            // context.fillRect(
            //     props.canvasWidth / 2 - squareSize / 2,
            //     props.canvasHeight / 2 - squareSize / 2,
            //     squareSize,
            //     squareSize
            // );
            // context.arc(viewportTopLeft.x, viewportTopLeft.y, 5, 0, 2 * Math.PI);
            // context.fillStyle = "red";
            context.fill();
        }
    }, [
        props.canvasWidth,
        props.canvasHeight,
        context,
        scale,
        offset,
        viewportTopLeft
    ]);

    // add event listener on canvas for mouse position
    useEffect(() => {
        const canvasElem = canvasRef.current;
        if (canvasElem === null) {
            return;
        }

        function handleUpdateMouse(event: MouseEvent) {
            event.preventDefault();
            if (canvasRef.current) {
                const viewportMousePos = { x: event.clientX, y: event.clientY };
                const topLeftCanvasPos = {
                    x: canvasRef.current.offsetLeft,
                    y: canvasRef.current.offsetTop
                };
                setMousePos(diffPoints(viewportMousePos, topLeftCanvasPos));
            }
        }

        canvasElem.addEventListener("mousemove", handleUpdateMouse);
        canvasElem.addEventListener("wheel", handleUpdateMouse);
        return () => {
            canvasElem.removeEventListener("mousemove", handleUpdateMouse);
            canvasElem.removeEventListener("wheel", handleUpdateMouse);
        };
    }, []);

    // add event listener on canvas for zoom
    useEffect(() => {
        const canvasElem = canvasRef.current;
        if (canvasElem === null) {
            return;
        }

        // this is tricky. Update the viewport's "origin" such that
        // the mouse doesn't move during scale - the 'zoom point' of the mouse
        // before and after zoom is relatively the same position on the viewport
        function handleWheel(event: WheelEvent) {
            event.preventDefault();
            if (context) {
                const zoom = 1 - event.deltaY / ZOOM_SENSITIVITY;
                const viewportTopLeftDelta = {
                    x: (mousePos.x / scale) * (1 - 1 / zoom),
                    y: (mousePos.y / scale) * (1 - 1 / zoom)
                };
                const newViewportTopLeft = addPoints(
                    viewportTopLeft,
                    viewportTopLeftDelta
                );

                context.translate(viewportTopLeft.x, viewportTopLeft.y);
                context.scale(zoom, zoom);
                context.translate(-newViewportTopLeft.x, -newViewportTopLeft.y);

                setViewportTopLeft(newViewportTopLeft);
                setScale(scale * zoom);
                isResetRef.current = false;
            }
        }

        canvasElem.addEventListener("wheel", handleWheel);
        return () => canvasElem.removeEventListener("wheel", handleWheel);
    }, [context, mousePos.x, mousePos.y, viewportTopLeft, scale]);

    return (
        <div>
            <button onClick={() => context && reset(context)}>Reset</button>
            <pre>scale: {scale}</pre>
            <pre>offset: {JSON.stringify(offset)}</pre>
            <pre>viewportTopLeft: {JSON.stringify(viewportTopLeft)}</pre>
            <canvas
                onMouseDown={startPan}
                ref={canvasRef}
                width={props.canvasWidth * ratio}
                height={props.canvasHeight * ratio}
                style={{
                    border: "2px solid #000",
                    width: `${props.canvasWidth}px`,
                    height: `${props.canvasHeight}px`
                }}
            ></canvas>
        </div>
    );
}
