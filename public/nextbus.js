async function nextArrival(){
    // Add the stop to the map
    let stoplat=currentStop[stops.indexOf('stop_lat')]
    let stoplon=currentStop[stops.indexOf('stop_lon')]
    let shape=[[stoplat,stoplon]];
    const cvs = document.createElement('canvas');
    cvs.setAttribute('style', 'height: 20px, width: 20px');
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.stroke();
    const srcUrl = cvs.toDataURL();
    const circle = L.icon({ iconUrl: srcUrl, iconSize: [200, 100], iconAnchor: [10, 10], popupAnchor: [0, -9] });
    let pop=`#${currentStop[stops.indexOf('stop_code')]}: ${currentStop[stops.indexOf('stop_name')]}`;
    L.marker([stoplat,stoplon],{icon:circle}).addTo(map).bindPopup(pop);

    // Get the current time
    const date=new Date();
    let mins=date.getMinutes();
    let secs=date.getSeconds();
    if(mins<10){
        mins='0'+mins;
    }if(secs<10){
        secs='0'+secs;
    }
    const currentTime=date.getHours()+':'+mins+':'+secs;

    // Add each vehicle to the map
    for(let i=1;i<vehicles.length;i++){
        if(JSON.stringify(vehicles[i])=='{}') continue;
        const vehicle=vehicles[i];
        const vehid=(agency=='MiWay')?vehicle.vehicle.label:vehicle.vehicle.id;
        let popup = `<div style="font-size:20px;">Vehicle ${vehid} on route ${stoproutes[i][stoproutes[0].indexOf('route_short_name')]} ${stoproutes[i][stoproutes[0].indexOf('route_long_name')]}`;
        if(actualTimes[i].length>0){
            const timeRemaining=subtract(currentTime, actualTimes[i]);
            popup += '<br> Arrives in ';
            if(timeRemaining.hrDiff==1) popup+='1 hour ';
            else if(timeRemaining.hrDiff>1) popup+=timeRemaining.hrDiff+' hours '
            if(timeRemaining.minDiff==1) popup+='1 minute ';
            else if(timeRemaining.minDiff>1) popup+=timeRemaining.minDiff+' minutes '
            popup+=`at ${actualTimes[i]}`;
        }else{
            const timeRemaining=subtract(currentTime, arrivalTimes[i]);
            popup += '<br> Scheduled to arrive in ';
            if(timeRemaining.hrDiff==1) popup+='1 hour ';
            else if(timeRemaining.hrDiff>1) popup+=timeRemaining.hrDiff+' hours '
            if(timeRemaining.minDiff==1) popup+='1 minute ';
            else if(timeRemaining.minDiff>1) popup+=timeRemaining.minDiff+' minutes '
            popup+=`at ${arrivalTimes[i]}`;
        }popup+='</div>';
        const canvas = document.createElement('canvas');
        canvas.setAttribute('style', 'height: 30px, width: 30px');
        const context = canvas.getContext('2d');
        context.fillStyle = '#' + stoproutes[i][stoproutes[0].indexOf('route_color')];
        context.arc(15, 15, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#000000';
        context.arc(15, 15, 14, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = '#ffffff';
        context.font = '8px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(vehid, 15, 15);
        const src = canvas.toDataURL();
        const icon = L.icon({ iconUrl: src, iconSize: [300, 150], iconAnchor: [15, 15], popupAnchor: [0, -14] });
        shape.push([vehicle.position.latitude, vehicle.position.longitude]);
        L.marker([vehicle.position.latitude, vehicle.position.longitude], { icon: icon }).addTo(map).bindPopup(popup);
    }
    
    map.fitBounds(L.latLngBounds(shape));
}
function subtract(time1str, time2str){
    const time1=time1str.split(":");
    const time2=time2str.split(":");
    let hrDiff=parseInt(time2[0])-parseInt(time1[0]);
    let minDiff=parseInt(time2[1])-parseInt(time1[1]);
    let secDiff=parseInt(time2[2])-parseInt(time1[2]);
    if(secDiff<0){
        secDiff+=60;
        minDiff--;
    }if(minDiff<0){
        minDiff+=60;
        hrDiff--;
    } return {"hrDiff": hrDiff, "minDiff": minDiff, "secDiff": secDiff};
}

nextArrival();