let outerBox;
let stopsLayer;
let vehiclesLayer;
let bounds=[];
var map;

async function init() {
    outerBox=document.getElementById('outerbox');
    outerBox.innerHTML='';
    const mapName=document.getElementById('mapname').value;

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
    // Create the container div for the map
    const container = document.createElement('div');
    container.setAttribute('style', 'width: 95%');
    outerBox.appendChild(container);

    // Create the div that will hold the Leaflet map
    const mapdiv = document.createElement('div');
    mapdiv.setAttribute('style', 'height: 550px');
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

    // Fill the map with all vehicles for TTC
    if(agency=='TTC'){
        let vehiclemarkers=[];
        for (const vehicle of vehicles) {
            let popup = `Vehicle ${vehicle.id} on route `;
            const canvas = document.createElement('canvas');
            canvas.setAttribute('style', 'height: 30px, width: 30px');
            const context = canvas.getContext('2d');
            let hasDirection=false;
            for (const direction of directions) {
                if (vehicle.dirTag == direction[directions[0].indexOf('dirTag')]) {
                    const dir=direction[directions[0].indexOf('dirTitle')];
                    popup += `${dir.substring(dir.indexOf('-')+2)}`;
                    hasDirection=true;
                }
            }
            if(!hasDirection){
                for(let i=1;i<routes.length;i++){
                    if (vehicle.routeTag == routes[i][routes[0].indexOf('route_short_name')]) {
                        popup += routes[i][routes[0].indexOf('route_short_name')]+' '+routes[i][routes[0].indexOf('route_long_name')];
                    }
                }
            }
            context.fillStyle = '#ff0000';
            context.arc(15, 15, 14, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#000000';
            context.arc(15, 15, 14, 0, Math.PI * 2);
            context.stroke();
            context.fillStyle = '#ffffff';
            context.font = '9px sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(vehicle.id, 15, 15);
            const src = canvas.toDataURL();
            const icon = L.icon({ iconUrl: src, iconSize: [300, 150], iconAnchor: [15, 15], popupAnchor: [0, -14] });
            vehiclemarkers.push(L.marker([vehicle.lat, vehicle.lon], { icon: icon }).bindPopup(popup));
            bounds.push([vehicle.lat, vehicle.lon]);
        }
        vehiclesLayer=L.layerGroup(vehiclemarkers);
        map.on('zoomend', function() {
            if(map.getZoom()>12&&!map.hasLayer(vehiclesLayer)){
                vehiclesLayer.addTo(map);
            }else if(map.getZoom()<=12&&map.hasLayer(vehiclesLayer)){
                map.removeLayer(vehiclesLayer);
            }
        });
        console.log('vehicles loaded');
    }

    // Fill the map with all routes
    for(let h=1;h<routes.length;h++){
        let shape=[];
        let route=routes[h];
        let currentShape=[];
        let routecolor=route[routes[0].indexOf('route_color')];
        if(routecolor==undefined){
            routecolor='aaaaaa';
        }
        for (let i=1;i<shapes.length;i++) {
            if(shapes[i][0]==route[routes[0].indexOf('route_short_name')]){
                shape.push(shapes[i].slice(1,3));
                bounds.push(shapes[i].slice(1,3));
                let dist=0;
                if(shape.length>1){
                    dist=L.latLng(shape[shape.length-2]).distanceTo(shape[shape.length-1]);
                }
                if((route[routes[0].indexOf('route_type')]==2 && dist>2000) || (route[routes[0].indexOf('route_type')]==3 && dist>1000) || (route[routes[0].indexOf('route_type')]==0 && dist>1000)){
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
    zoomOut();
    //console.log(shapes);
    console.log('routes loaded');
    //map.fitBounds(L.latLngBounds(bounds));
    document.getElementById('load').innerHTML='';

    // Display stops if the map is sufficiently zoomed in
    stopsLayer=L.layerGroup();
    map.on('moveend', async () => {
        if(map.getZoom()>13){
            // Use map boundaries to calculate map width / height
            const latRange=(map.getBounds()._northEast.lat-map.getBounds()._southWest.lat)/2.0;
            const lngRange=(map.getBounds()._northEast.lng-map.getBounds()._southWest.lng)/2.0;
            const stops = await fetch(`/${agency}/localStops?lat=${map.getCenter().lat}&lng=${map.getCenter().lng}&latRange=${latRange}&lngRange=${lngRange}`).then((response) => {return response.json()}).then((json) => {return json.stops});
            let stopmarkers=[];
            for(let i=1;i<stops.length;i++){
                let currentStop=stops[i];
                const cvs = document.createElement('canvas');
                cvs.setAttribute('style', 'height: 20px, width: 20px');
                const ctx = cvs.getContext('2d');
                ctx.fillStyle = '#0000ff';
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
            map.removeLayer(stopsLayer);
            stopsLayer=L.layerGroup(stopmarkers);
            stopsLayer.addTo(map);
        }else if(map.getZoom()<=13&&map.hasLayer(stopsLayer)){
            map.removeLayer(stopsLayer);
            stopsLayer=L.layerGroup();
        }
    });
}

function zoomToCurrent(){
    // Zoom in to user's location
    navigator.geolocation.getCurrentPosition(zoomIn, zoomOut);
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
    map.setZoom(11);
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

init();