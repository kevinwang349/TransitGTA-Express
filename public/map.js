let outerBox;
let stopsLayer;
let bounds=[];
var map;

async function init() {
    outerBox=document.getElementById('outerbox');
    outerBox.innerHTML='';
    const mapName=document.getElementById('mapname').value;
    if(mapName=='-'){
        return;
    }

    if(mapName=='Leaflet_Map'||mapName==undefined){
        generateMap();
    }else{
        getMap(mapName);
    }
}

async function getMap(mapName){
    // Display the map
    let container=document.createElement('a');
    container.setAttribute('href',mapName);
    let frame=document.createElement('embed');
    frame.setAttribute('src',mapName+"#toolbar=0");
    frame.setAttribute('style','position: absolute; width: 95%; height: 90%');
    container.appendChild(frame);
    outerBox.appendChild(container);
}

async function generateMap(){
    // Add instructions
    const inst=document.createElement('p');
    inst.innerHTML='Zoom in to see stops';
    outerBox.appendChild(inst);
    
    // Create the container div for the map
    const container = document.createElement('div');
    container.setAttribute('style', 'width: 500px');
    outerBox.appendChild(container);

    // Create the div that will hold the Leaflet map
    const mapdiv = document.createElement('div');
    mapdiv.setAttribute('style', 'height: 500px');
    container.appendChild(mapdiv);

    // Create the map and fill it with tiles
    map = L.map(mapdiv);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoia2V2aW53MjQwMSIsImEiOiJja3I1ODZqdWszMmdqMnBwYW9qbWVnY2c4In0.qqgVHQu94DuWbLbgjWMN9w'
    }).addTo(map);

    // Fill the map with all stops
    let stops=await fileArray('stops');
    let stopmarkers=[];
    for(let i=1;i<stops.length;i++){
        let currentStop=stops[i];
        const cvs = document.createElement('canvas');
        cvs.setAttribute('style', 'height: 20px, width: 20px');
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.arc(10, 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.arc(10, 10, 9, 0, Math.PI * 2);
        ctx.stroke();
        const srcUrl = cvs.toDataURL();
        const circle = L.icon({ iconUrl: srcUrl, iconSize: [200, 100], iconAnchor: [10, 10], popupAnchor: [0, -9] });
        let pop=`#${currentStop[stops[0].indexOf('stop_code')]}: ${currentStop[stops[0].indexOf('stop_name')]}<br><a href='https://transitGTA.onrender.com/${agency}/stopschedule?s=${currentStop[stops[0].indexOf('stop_id')]}'>Stop schedule for this stop</a><br><a href='https://transitGTA.onrender.com/${agency}/nextbus?s=${currentStop[stops[0].indexOf('stop_id')]}'>Next vehicle arrival at this stop</a>`;
        stopmarkers.push(L.marker([currentStop[stops[0].indexOf('stop_lat')],currentStop[stops[0].indexOf('stop_lon')]],{icon:circle}).bindPopup(pop));
        bounds.push([stops[i][stops[0].indexOf('stop_lat')],stops[i][stops[0].indexOf('stop_lon')]]);
    }
    stopsLayer=L.layerGroup(stopmarkers);
    map.on('zoomend', function() {
        if(map.getZoom()>13&&!map.hasLayer(stopsLayer)){
            stopsLayer.addTo(map);
        }else if(map.getZoom()<13&&map.hasLayer(stopsLayer)){
            map.removeLayer(stopsLayer);
        }
    });
    // Zoom in to user's location
    navigator.geolocation.getCurrentPosition(zoomIn, zoomOut);

    console.log('stops loaded');

    // Fill the map with all routes
    let routes=await fileArray('routes');
    for(let h=1;h<routes.length;h++){
        let shape=[];
        let route=routes[h];
        let currentShape=[];
        let routecolor=route[routes[0].indexOf('route_color')];
        if(routecolor==undefined){
            routecolor='aaaaaa';
        }
        for (let i=1;i<shapes.length;i++) {
            if(shapes[i][0]==route[routes[0].indexOf('route_id')]){
                shape.push(shapes[i].slice(1,3));
                bounds.push(shapes[i].slice(1,3));
                let dist=0;
                if(shape.length>1){
                    dist=L.latLng(shape[shape.length-2]).distanceTo(shape[shape.length-1]);
                }
                if(dist>500){
                    currentBranch=shapes[i][3];
                    L.polyline(currentShape,{color: `#${routecolor}`}).addTo(map);
                    //console.log(dist);
                    currentShape=[];
                }else{
                    currentShape.push(shapes[i].slice(1,3));
                }
            }else if(agency=='GO'&&shapes[i][0]==route[routes[0].indexOf('route_short_name')]){
                shape.push(shapes[i].slice(1,3));
                bounds.push(shapes[i].slice(1,3));
                let dist=0;
                if(shape.length>1){
                    dist=L.latLng(shape[shape.length-2]).distanceTo(shape[shape.length-1]);
                }
                if(dist>500){
                    currentBranch=shapes[i][3];
                    L.polyline(currentShape,{color: `#${routecolor}`}).addTo(map);
                    //console.log(dist);
                    currentShape=[];
                }else{
                    currentShape.push(shapes[i].slice(1,3));
                }
            }
        }
        //L.polyline(shape,{color: `#${route[routes[0].indexOf('route_color')]}`}).addTo(map)
        L.polyline(currentShape,{color: `#${routecolor}`}).addTo(map);
    }
    console.log('routes loaded');
    //map.fitBounds(L.latLngBounds(bounds));
}

function zoomIn(position){
    //console.log(position.coords);
    // Add marker at user's location
    const cvs = document.createElement('canvas');
    cvs.setAttribute('style', 'height: 20px, width: 20px');
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#0000ff';
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.stroke();
    const srcUrl = cvs.toDataURL();
    const circle = L.icon({ iconUrl: srcUrl, iconSize: [400, 200], iconAnchor: [10, 10], popupAnchor: [0, -9] });
    L.marker([position.coords.latitude,position.coords.longitude],{icon:circle}).bindPopup("Your current location").addTo(map);
    // Zoom to user's location
    map.setView([position.coords.latitude,position.coords.longitude],14);
}
function zoomOut(error){
    map.fitBounds(L.latLngBounds(bounds));
}

async function request(url) {
    let str='';
    let request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'text';
    request.onload = function () {
        str+=request.response;
    };
    request.send();
    return new Promise(resolve => {
        let interval=setInterval(() => {
            if(str.length>0){
                clearInterval(interval);
                resolve(str);
            }
        }, 500);
    });
}

async function fileArray(fileName){
    const file = await fetch(`/${agency}/fileArray/${fileName}`).then((response) => {return response.json()}).then((json) => {return json.file});
    return file;
}

function findRow(table=[[]], searchColName='', searchStr=''){
    for(const row of table){
        if(row[table[0].indexOf(searchColName)]==searchStr){
            return row;
        }
    }
    return [];
}