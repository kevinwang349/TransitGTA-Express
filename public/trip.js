function tripSchedule(){
    L.polyline(shape,{color: `#${color}`}).addTo(map); // add trip shape to map
    // Add vehicle to map, if found
    if(vehicleFound == 'true'){
        const canvas = document.createElement('canvas');
        canvas.setAttribute('style', 'height: 30px, width: 30px');
        if(agency=='TTC'){
            const ctx = canvas.getContext('2d');
            const angleRad=vehicle.heading*Math.PI/180;
            const radius=15*Math.sqrt(2);
            const ctrx=radius*Math.sin(angleRad+Math.PI/4);
            const ctry=radius*Math.cos(angleRad+Math.PI/4);
            ctx.rotate(angleRad);
            ctx.fillStyle = '#'+color;
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
            const src = canvas.toDataURL();
            const icon = L.icon({iconUrl: src,iconSize: [300,150],iconAnchor: [15,15],popupAnchor: [0,-14]});
            L.marker([vehicle.lat,vehicle.lon], { icon: icon }).addTo(map).bindPopup(popup);
        }else{
            const context = canvas.getContext('2d');
            context.fillStyle = '#'+color;
            context.arc(15, 15, 14, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#000000';
            context.arc(15, 15, 14, 0, Math.PI * 2);
            context.stroke();
            context.fillStyle = '#ffffff';
            context.font = '8px sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            if(agency=='MiWay'){
                context.fillText(vehicle.vehicle.label,15,15);
            }else if(agency!='VIA') context.fillText(vehicle.vehicle.id,15,15);
            const src = canvas.toDataURL();
            const position=(agency=='VIA')?[vehicle.lat,vehicle.lng]:[vehicle.position.latitude,vehicle.position.longitude];
            const icon = L.icon({iconUrl: src,iconSize: [300,150],iconAnchor: [15,15],popupAnchor: [0,-14]});
            L.marker(position, { icon: icon }).addTo(map).bindPopup(popup);
        }
    }
    for(let i=1;i<tripstops.length;i++){
        // Add stop to map
        const cvs = document.createElement('canvas');
        cvs.setAttribute('style', 'height: 20px, width: 20px');
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#'+color;
        ctx.arc(10, 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.arc(10, 10, 9, 0, Math.PI * 2);
        ctx.stroke();
        const srcUrl = cvs.toDataURL();
        const circle = L.icon({ iconUrl: srcUrl, iconSize: [200, 100], iconAnchor: [10, 10], popupAnchor: [0, -9] });
        let pop=`<div style="font-size: 20px;">#${tripstops[i][tripstops[0].indexOf('stop_code')]}: ${tripstops[i][tripstops[0].indexOf('stop_name')]}
            <br><a href="./stopschedule?s=${tripstops[i][tripstops[0].indexOf('stop_id')]}">Stop schedule for this stop</a>
            <br><a href="./nextbus?s=${tripstops[i][tripstops[0].indexOf('stop_id')]}">Next vehicle arrival at this stop</a></div>`;
        L.marker([tripstops[i][tripstops[0].indexOf('stop_lat')],tripstops[i][tripstops[0].indexOf('stop_lon')]],{icon:circle}).addTo(map).bindPopup(pop);
        //shape.push([tripstops[tripstops[0].indexOf('stop_lat')],tripstops[tripstops[0].indexOf('stop_lon')]]);
        //const sender=`#${tripstops[stops[0].indexOf('stop_code')]} ${tripstops[stops[0].indexOf('stop_name')]} at ${arrivalTimes[i]}`;
        //display(sender);
    }
    if(shape.length==0){
        shape=[[43.2531218,-79.8691736],[43.871052,-78.8847276]];
    }
    map.fitBounds(L.latLngBounds(shape));
}
tripSchedule();