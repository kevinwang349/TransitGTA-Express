async function nextPrediction(){
    // Get all necessary resources
    const stops=await fileArray('stops');
    // If no route filter selected, add all route ids to the routeids filter
    const routes=await fileArray('routes');
    for(let i=0;i<routes.length;i++){
        routeids.push(routes[i][routes[0].indexOf('route_id')]);
    }
    // Find and display the stop
    let currentStop=findRow(stops,'stop_code',stopid);
    display('Current stop is #'+currentStop[stops[0].indexOf('stop_code')]+' '+currentStop[stops[0].indexOf('stop_name')]);
    // Add the stop to the map
    let stoplat=currentStop[stops[0].indexOf('stop_lat')]
    let stoplon=currentStop[stops[0].indexOf('stop_lon')]
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
    let pop=`#${currentStop[stops[0].indexOf('stop_code')]}: ${currentStop[stops[0].indexOf('stop_name')]}`;
    L.marker([stoplat,stoplon],{icon:circle}).addTo(map).bindPopup(pop);
    
    request('https://retro.umoiq.com/service/publicJSONFeed?command=predictions&a=ttc&stopId=' + stopid).then((response) => {
        const json=JSON.parse(response);
        let predictions=json.predictions;
        if(json.Error!=undefined){
            display(json.Error.content);
            return;
        }
        if(predictions.length==undefined){
            predictions=[predictions];
        }
        for(const prediction of predictions){
            if(prediction.dirTitleBecauseNoPredictions!=undefined){
                display(prediction.dirTitleBecauseNoPredictions+':');
                display('No arrivals');
                continue;
            }
            let directions=prediction.direction;
            if(directions.length==undefined){
                directions=[directions];
            }
            for(const direction of directions){
                display(direction.title+':');
                let times=direction.prediction;
                if(times.length==undefined){
                    times=[times];
                }
                for(const time of times){
                    // Display the arrival time
                    let date=new Date(parseInt(time.epochTime));
                    //console.log(date);
                    let seconds=time.seconds;
                    let minsRemaining=time.minutes;
                    let secsRemaining=seconds-minsRemaining*60;
                    let sender='Arriving in ';
                    if(minsRemaining==1){
                        sender+='1 minute and '+secsRemaining+' second(s) at ';
                    }else if(minsRemaining==0){
                        sender+=secsRemaining+' seconds at ';
                    }else{
                        sender+=minsRemaining+' minutes and '+secsRemaining+' second(s) at ';
                    }
                    let hours=date.getHours();
                    let minutes=date.getMinutes();
                    if(minutes<10){
                        minutes='0'+minutes;
                    }
                    if(hours==0){
                        sender+='12:'+minutes+' AM';
                    }else if(hours>12){
                        hours-=12;
                        sender+=hours+':'+minutes+' PM';
                    }else{
                        sender+=hours+':'+minutes+' AM';
                    }
                    display(sender);
                    // Add the vehicle to the map
                    request('https://retro.umoiq.com/service/publicJSONFeed?command=vehicleLocation&a=ttc&v='+time.vehicle).then((response) => {
                        response=response.substring(0,response.length-2);
                        const json=JSON.parse(response);
                        const vehicle=json.vehicle;
                        let popup=`Vehicle ${vehicle.id} on ${direction.title}<br>${sender}`;
                        const canvas = document.createElement('canvas');
                        canvas.setAttribute('style', 'height: 30px, width: 30px');
                        const context = canvas.getContext('2d');
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
                        context.fillText(vehicle.id,15,15);
                        const src = canvas.toDataURL();
                        const icon = L.icon({iconUrl: src,iconSize: [300,150],iconAnchor: [15,15],popupAnchor: [0,-14]});
                        L.marker([vehicle.lat,vehicle.lon], { icon: icon }).addTo(map).bindPopup(popup);
                        shape.push([vehicle.lat,vehicle.lon]);
                    });
                }
            }
        }
        loading=0;
    });
    setTimeout(() => {
        map.fitBounds(L.latLngBounds(shape));
    },2000);
}
//nextPrediction();