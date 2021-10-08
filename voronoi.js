import { Delaunay } from "d3-delaunay";

export let showVoronoi = false;
let visitedCell, oldLink, oldLinkStyle;
let prediction;
let handleMouseClickVoronoiGlobal, delaunay
let voronoiCellToElement, pixelToCanvas, ctx, voronoi, linkDisplay

function handleEyeMoveVoronoi() {
    if (prediction === undefined) {
        console.log("Undefined prediction")
        return
    }
    const bounded = webgazer.util.bound(prediction);
    const transformed = pixelToCanvas(bounded.x, bounded.y);

    let cell = delaunay.find(transformed.x, transformed.y - document.body.getBoundingClientRect().top)

    console.log({prediction, bounded, transformed, cell, ctx})

    if (visitedCell != cell) {
        if (visitedCell !== undefined) {
            let oldLink = voronoiCellToElement.get(visitedCell);
            oldLink.style['outline'] = oldLinkStyle;

            if (showVoronoi) {
                ctx.strokeStyle='black';
                ctx.beginPath();
                voronoi.renderCell(visitedCell, ctx);
                ctx.stroke();
            }
        }

        let newLink = voronoiCellToElement.get(cell);
        oldLink = newLink;
        oldLinkStyle = newLink.style['outline'] || 'none';
        newLink.style['outline'] = '5px solid black';

        if (newLink.tagName == 'A') {
            linkDisplay.innerHTML = newLink.href;
        }
        else if (newLink.tagName == 'INPUT') {
            linkDisplay.innerHTML = newLink.value;
        }

        if (showVoronoi) {
            ctx.strokeStyle='red';
            ctx.beginPath();
            voronoi.renderCell(cell, ctx);
            ctx.stroke();
        }
    }

    visitedCell = cell;
}


export function drawVoronoi() {
    eraseVoronoi();
    linkDisplay = document.createElement("div");
    linkDisplay.setAttribute("id", "attachedLinkOverlayForDelaunay")
    linkDisplay.style['outline'] = '5px solid black';
    linkDisplay.style['position'] = 'fixed';
    linkDisplay.style['top'] = '1em';
    linkDisplay.style['right'] = '10%';
    linkDisplay.style['maxWidth'] = '80%';
    linkDisplay.style['overflowWrap'] = 'break-word';
    linkDisplay.style['font-size'] = '32px';
    linkDisplay.style['zIndex'] = '9999999999999999999999999999';
    linkDisplay.style['background-color'] = 'white';
    document.body.appendChild(linkDisplay)

    let all = document.querySelectorAll('a, input')
    let canvas = document.createElement("canvas");
    canvas.setAttribute("id", "attachedCanvasOverlayForDelaunay")
    let bigbox = document.documentElement.getBoundingClientRect();
    let fullHeight = document.documentElement.scrollHeight;
    let fullWidth = document.documentElement.scrollWidth;
    let canvasPixelWidth = fullWidth;
    let canvasPixelHeight = fullHeight;

    canvas.style['position'] = 'absolute';
    canvas.setAttribute('width', canvasPixelWidth + 'px');
    canvas.setAttribute('height', canvasPixelHeight + 'px');
    canvas.style['left'] = '0';
    canvas.style['top'] = '0';
    canvas.style['zIndex'] = '999999999999999999999999999';
    canvas.style['pointer-events'] = 'none';
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;
    document.body.appendChild(canvas)

    ctx = canvas.getContext('2d');
    let canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "red";
    //console.log(canvasWidth, canvasHeight, canvasPixelWidth, canvasPixelHeight)

    pixelToCanvas = (x, y) => ({
        x: canvasWidth * (x / canvasPixelWidth),
        y: canvasHeight * (y / canvasPixelHeight)
    })

    let points = [];
    let pointsWithNodes = [];

    for (let i=0; i<all.length; i++) {
        let node = all[i];

        let rect = node.getBoundingClientRect();
        let centerX = (rect.left + rect.right)/2;
        let centerY = (rect.top + rect.bottom)/2 - bigbox.top;

        let canvaspts = pixelToCanvas(centerX, centerY);

        if (showVoronoi) {
            ctx.fillRect(canvaspts.x - 2, canvaspts.y - 2, 5, 5);
        }

        points.push([canvaspts.x, canvaspts.y])
        pointsWithNodes.push([canvaspts.x, canvaspts.y, node])
    }

    delaunay = Delaunay.from(points);

    voronoi = delaunay.voronoi([1, 1, canvasWidth, canvasHeight])
    if (showVoronoi) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        voronoi.render(ctx);
        ctx.stroke();
    }

    voronoiCellToElement = new Map();
    pointsWithNodes.forEach((entry) => {
        let x = entry[0];
        let y = entry[1];
        let node = entry[2];
        let cell = delaunay.find(x, y)
        voronoiCellToElement.set(cell, node)
    });

    function handleMouseClickVoronoi(event) {
        let transformed = pixelToCanvas(event.layerX, event.layerY);
        let cell = delaunay.find(transformed.x, transformed.y)
        let node = voronoiCellToElement.get(cell)

        node.click();
    }

    handleMouseClickVoronoiGlobal = handleMouseClickVoronoi;

    webgazer.setGazeListener(updateGlobalEyePosition)
    window.addEventListener("resize", drawVoronoi)
    //window.addEventListener("touchstart", handleMouseMoveVoronoiGlobal);
    //window.addEventListener("click", handleMouseClickVoronoiGlobal);
};

export function eraseVoronoi() {
    //window.removeEventListener("touchstart", handleMouseMoveVoronoiGlobal);
    webgazer.clearGazeListener() 
    //window.removeEventListener("click", handleMouseClickVoronoiGlobal);
    window.removeEventListener("resize", drawVoronoi)

    if (oldLink !== undefined) {
        oldLink.style['outline'] = oldLinkStyle;
    }

    try{
        document.getElementById("attachedLinkOverlayForDelaunay").remove();
        document.getElementById("attachedCanvasOverlayForDelaunay").remove();
    }
    catch(TypeError) {
    }
}

export function toggleVoronoi() {
    showVoronoi = !showVoronoi;
    drawVoronoi();
}

export function updateGlobalEyePosition(data, elapsedTime) {
    if (data == null) {
        return;
    }

    prediction = data;
    
    if (delaunay !== undefined) {
        handleEyeMoveVoronoi()
    }
}

export function initWebgazer() {
    webgazer
        .setRegression("ridge")
        .setTracker('TFFacemesh')
        .setGazeListener(updateGlobalEyePosition)
        .begin();
    webgazer.showVideoPreview(true)
        .showFaceOverlay(true)
        .showFaceFeedbackBox(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true)
}

drawVoronoi();

window.saveDataAcrossSessions = true;
window.addEventListener("load", initWebgazer)
window.addEventListener("load", drawVoronoi);
