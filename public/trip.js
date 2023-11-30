function tripSchedule(){
    L.polyline(shape,{color: `#${color}`}).addTo(map); // add trip shape to map
    // Add vehicle to map, if found
    if(vehicleFound == 'true'){
        const canvas = document.createElement('canvas');
        canvas.setAttribute('style', 'height: 30px, width: 30px');
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
        if(agency!='VIA') context.fillText(vehicle.vehicle.id,15,15);
        const src = canvas.toDataURL();
        let position=[];
        if(agency=='VIA') position=[vehicle.lat,vehicle.lng];
        else position=[vehicle.position.latitude,vehicle.position.longitude];
        const icon = L.icon({iconUrl: src,iconSize: [300,150],iconAnchor: [15,15],popupAnchor: [0,-14]});
        L.marker(position, { icon: icon }).addTo(map).bindPopup(popup);
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
        let pop=`#${tripstops[i][tripstops[0].indexOf('stop_code')]}: ${tripstops[i][tripstops[0].indexOf('stop_name')]}`;
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