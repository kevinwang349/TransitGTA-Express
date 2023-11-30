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

async function routevehsTTC(routeid){
    let directions = [];
    // Add the route's path to the map
    request('https://retro.umoiq.com/service/publicJSONFeed?command=routeConfig&a=ttc&r=' + routeid).then((response) => {
        const json = JSON.parse(response);
        const route=json.route;
        directions = route.direction;
        let path = route.path;
        for (let i = 0; i < path.length; i++) {
            let points = path[i].point;
            let shape = [];
            for (const point of points) {
                shape.push([point.lat, point.lon]);
            }
            L.polyline(shape, { color: `#ff0000` }).addTo(map);
        }
        map.fitBounds(L.latLngBounds([[route.latMin, route.lonMin], [route.latMax,route.lonMax]]));
    });

    // Add buses on the route
    request('https://retro.umoiq.com/service/publicJSONFeed?command=vehicleLocations&a=ttc').then((response) => {
        const json = JSON.parse(response);
        const vehicles = json.vehicle;
        for (const vehicle of vehicles) {
            if (vehicle.routeTag == routeid) {
                let popup = `Vehicle ${vehicle.id} on route `;
                const canvas = document.createElement('canvas');
                canvas.setAttribute('style', 'height: 30px, width: 30px');
                const context = canvas.getContext('2d');
                for (const direction of directions) {
                    if (vehicle.dirTag == direction.tag) {
                        popup += `${direction.title}`;
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
                L.marker([vehicle.lat, vehicle.lon], { icon: icon }).addTo(map).bindPopup(popup);
            }
        }
    });
    // Add link to route schedule
    let link=document.createElement('a');
    link.setAttribute('href','https://transitGTA.kevinwang21.repl.co/routeschedule/?a=TTC&r='+routeid);
    link.innerText='Link to route schedule';
    document.body.appendChild(link);
}

routevehsTTC(routeid);