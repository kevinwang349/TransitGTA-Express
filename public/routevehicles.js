async function routevehs(routename){
    let shape = [];
    // Add the route's path to the map *** Requires routeshapes.txt AND code to process shapes in index.js
    //let branchctr=-1;
    //let currentBranch=-1;
    let currentShape=[];
    for (let i=0;i<shapes.length;i++) {
        shape.push(shapes[i]);
        let dist=0;
        if(shape.length>1){
            dist=L.latLng(shape[shape.length-2]).distanceTo(shape[shape.length-1]);
        }
        if(dist>1000&&route[routeLegend.indexOf('route_type')]!=2){
            currentBranch=shapes[i][3];
            L.polyline(currentShape,{color: `#${route[routeLegend.indexOf('route_color')]}`}).addTo(map);
            //console.log(dist);
            currentShape=[];
        }else{
            currentShape.push(shapes[i]);
        }
    }
    //L.polyline(shape,{color: `#${route[routeLegend.indexOf('route_color')]}`}).addTo(map)
    L.polyline(currentShape,{color: `#${route[routeLegend.indexOf('route_color')]}`}).addTo(map);

    // Add all stops to the map
    const stopmarkers=[];
    for(let i=1;i<routestops.length;i++){
        let currentStop=routestops[i];
        const cvs = document.createElement('canvas');
        cvs.setAttribute('style', 'height: 20px, width: 20px');
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#'+route[routeLegend.indexOf('route_color')];
        ctx.arc(10, 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.arc(10, 10, 9, 0, Math.PI * 2);
        ctx.stroke();
        const srcUrl = cvs.toDataURL();
        const circle = L.icon({ iconUrl: srcUrl, iconSize: [200, 100], iconAnchor: [10, 10], popupAnchor: [0, -9] });
        let pop=`#${currentStop[routestops[0].indexOf('stop_code')]}: ${currentStop[routestops[0].indexOf('stop_name')]}<br>
            <a href='./stopschedule?a=${agency}&s=${currentStop[routestops[0].indexOf('stop_id')]}'>Stop schedule for this stop</a><br>
            <a href='./nextbus?a=${agency}&s=${currentStop[routestops[0].indexOf('stop_id')]}'>Next vehicle arrival at this stop</a>`;
        stopmarkers.push(L.marker([currentStop[routestops[0].indexOf('stop_lat')],currentStop[routestops[0].indexOf('stop_lon')]],{icon:circle}).bindPopup(pop));
        //shape.push([currentStop[routestops[0].indexOf('stop_lat')],currentStop[routestops[0].indexOf('stop_lon')]]); // ***
    }
    stopsLayer=L.layerGroup(stopmarkers);
    map.addLayer(stopsLayer); // add stops to the map by default

    // Display vehicles on the route
    const vehiclemarkers=[];
    let i=1;
    for(const entity of json){
        const vehicle=entity.vehicle;
        if(vehicle.trip.route_id==route[routeLegend.indexOf('route_id')]){
            let vehid=vehicle.vehicle.id;
            if(agency=='MiWay'){
                vehid=vehicle.vehicle.label;
            }
            console.log(vehid);
            let popup='';
            const canvas = document.createElement('canvas');
            canvas.setAttribute('style', 'height: 30px, width: 30px');
            // GO Transit train routes only -- use ServiceataGlance data
            if(agency=='GO'&&route[routeLegend.indexOf('route_type')]==2){
                const tripid=vehicle.trip.trip_id.split('-');
                const tripnum=tripid[2];
                let train={};
                for (const trip of json2) {
                    if(trip.TripNumber==tripnum){
                        train=trip;
                        break;
                    }
                }
                const directions=new Map();
                directions.set('N','north');
                directions.set('S','south');
                directions.set('E','east');
                directions.set('W','west');
                popup = `Train #${vehid} on route ${route[routeLegend.indexOf('route_long_name')]} heading ${directions.get(train.VariantDir)}bound `;
                if (train.Display != null) {
                    popup += `towards ${train.Display.substring(5)}`;
                    if (!train.IsInMotion) {
                        let atStop = findRow(routestops, 'stop_id', train.AtStationCode);
                        popup += `<br>At ${atStop[routestops[0].indexOf('stop_name')]}`;
                    }
                } else {
                    let dest = findRow(routestops, 'stop_id', train.LastStopCode);
                    popup += `towards ${dest[routestops[0].indexOf('stop_name')]}`;
                    if (!train.IsInMotion) {
                        let atStop = findRow(routestops, 'stop_id', train.PrevStopCode);
                        popup += `<br>At ${atStop[routestops[0].indexOf('stop_name')]}`;
                    }
                }
                popup += `<br>Length: ${train.Cars} cars`;
                // Draw a marker
                const ctx = canvas.getContext('2d');
                const angleRad=train.Course*Math.PI/180;
                const radius=15*Math.sqrt(2);
                const ctrx=radius*Math.sin(angleRad+Math.PI/4);
                const ctry=radius*Math.cos(angleRad+Math.PI/4);
                ctx.rotate(angleRad);
                ctx.fillStyle = '#' + route[routeLegend.indexOf('route_color')];
                ctx.arc(ctrx, ctry, 10, 0, Math.PI*2);
                ctx.fill();
                ctx.beginPath();
                ctx.strokeStyle = '#000000';
                ctx.arc(ctrx, ctry, 10, -Math.PI/4, 5*Math.PI/4);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(ctrx-10/Math.sqrt(2),ctry-10/Math.sqrt(2));
                ctx.lineTo(ctrx,ctry-10*Math.sqrt(2));
                ctx.lineTo(ctrx+10/Math.sqrt(2),ctry-10/Math.sqrt(2));
                ctx.fill();
                ctx.stroke();
            }else{ // Other agencies -- GTFS-RT data only
                const trip=trips[i];
                i++;
                popup=`Vehicle ${vehid} on route ${route[routeLegend.indexOf('route_short_name')]} ${route[routeLegend.indexOf('route_long_name')]}`;
                if(trip.length>1){
                    popup+=` towards <a href="./trip?t=${trip[trips[0].indexOf('trip_id')]}">${trip[trips[0].indexOf('trip_headsign')]}</a>`;
                }
                // Draw a circular marker
                const context = canvas.getContext('2d');
                context.fillStyle = '#'+route[routeLegend.indexOf('route_color')];
                context.arc(15, 15, 14, 0, Math.PI * 2);
                context.fill();
                context.fillStyle = '#000000';
                context.arc(15, 15, 14, 0, Math.PI * 2);
                context.stroke();
                context.fillStyle = '#ffffff';
                context.font = '8px sans-serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(vehid,15,15);
            }
            const src = canvas.toDataURL();
            const icon = L.icon({iconUrl: src,iconSize: [300,150],iconAnchor: [15,15],popupAnchor: [0,-14]});
            vehiclemarkers.push(L.marker([vehicle.position.latitude,vehicle.position.longitude], { icon: icon }).bindPopup(popup));
        }
    }
    vehiclesLayer=L.layerGroup(vehiclemarkers);
    const overlays={
        "Stops": stopsLayer,
        "Vehicles": vehiclesLayer
    };
    layerControl=L.control.layers(null, overlays).addTo(map);
    // Add link to route schedule
    let link=document.createElement('a');
    link.setAttribute('href','./routeschedule?a='+agency+'&r='+route[routeLegend.indexOf('route_short_name')]);
    link.innerText='Route schedule for '+route[routeLegend.indexOf('route_short_name')]+' '+route[routeLegend.indexOf('route_long_name')];
    document.body.appendChild(link);
    const date=new Date();
    display('Timestamp: '+date.toLocaleTimeString()+' '+date.toDateString());

    // Display the map
    if(shape.length==0){
        display('Route '+routename+' not found');
    }else{
        map.fitBounds(L.latLngBounds(shape));
    }
    loading=0;
}

function display(output='') {
    const p = document.createElement('p');
    p.innerText = output;
    document.body.appendChild(p);
}

routevehs();