//document.addEventListener('DOMContentLoaded', init);
let map;
let agency='';
let routeid='';
let dirid='';
let routes;
let trips;
let stops;
let times;
let update;
let dateStr='';
let date=new Date();
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const serviceMap=['sun','wkd','wkd','wkd','wkd','wkd','sat'];

async function init() {
    
    /* Get all url flags
    const params=new URLSearchParams(window.location.search);
    agency=params.get('a');
    routeid=params.get('r');
    if(routeid==undefined){
        display('No route id provided!');
        return;
    }
    dirid=params.get('d');
    if(dirid==undefined){
        dirid=0;
    }
    dateStr=params.get('t');
    if(dateStr!=undefined){
        date=new Date(dateStr);
        date.setUTCHours('5');
        if(date.toString()=='Invalid Date'){
            date=new Date();
        }
    }else{
        const localDate=new Date(date-date.getTimezoneOffset()*60000);
        dateStr = localDate.toISOString().substring(0, 10);
    }
    // Start loading sequence
    load = document.createElement('p');
    load.innerHTML='Loading.';
    document.body.appendChild(load);
    loading=3;
    setInterval(updateLoading, 1000);
    if(agency=='YRT'||agency=='MiWay'||agency=='DRT'||agency=='Brampton'||agency=='GO'||agency=='Niagara'||agency=='Burlington'||agency=='HSR'||agency=='UPX'||agency=='Oakville'||agency=='VIA'){
        routes=await fileArray('routes');
        trips=await fileArray('trips');
        stops=await fileArray('stops');
        times=await fileArray('stop_times');
        generateSchedule();
    }else if(agency=='TTC'){
        routes=await fileArray('routes');
        trips=await fileArray('trips');
        getScheduleTTC();
    }else{
        display('Sorry, no data available for agency '+agency);
        loading=0;
    }*/
}

async function generateSchedule(){
    // Clear the document body and add a homepage link
    document.body.innerHTML='<a href="https://transitGTA.kevinwang21.repl.co" style="font-size: 20px; color: #ff0000">Home</a>';
    document.body.appendChild(load);
    // Display the route and date
    let route=findRow(routes,'route_short_name',routeid);
    if(agency=='VIA') route=findRow(routes,'route_id',routeid);
    if(route.length>0){
        display(`Schedule for route ${routeid} ${route[routes[0].indexOf('route_long_name')]} on ${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}:`);
    }else{
        display('Sorry, no data available for route '+routeid);
        loading=0;
        return;
    }
    // Get all necessary resources
    const tripids=await findTrips(route[routes[0].indexOf('route_id')]);
    if(tripids.length==0){
        display(`Sorry, there is no service on route ${routeid} ${route[routes[0].indexOf('route_long_name')]} on ${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}.`);
        loading=0;
        return;
    }
    let scheduleTable=[[]];
    let stoptripids=[''];
    for (let i = 1; i < times.length; i++) {
        const stop = times[i];
        if (tripids.includes(stop[times[0].indexOf('trip_id')])){
            if(!scheduleTable[0].includes(stop[times[0].indexOf('stop_id')])){
                scheduleTable[0].push(stop[times[0].indexOf('stop_id')]);
            }
            if(!stoptripids.includes(stop[times[0].indexOf('trip_id')])){
                stoptripids.push(stop[times[0].indexOf('trip_id')]);
                scheduleTable.push([]);
            }
            const row=stoptripids.indexOf(stop[times[0].indexOf('trip_id')]);
            const col=scheduleTable[0].indexOf(stop[times[0].indexOf('stop_id')]);
            scheduleTable[row][col]=stop[times[0].indexOf('departure_time')];
        }
    }
    // Sort the stops using insertion sort
    for(let i=1;i<scheduleTable.length;i++){
        for(let j=1;j<scheduleTable[i].length;j++){
            let nextStop=scheduleTable[i][j];
            for(let k=j;k>=0;k--){
                if(scheduleTable[i][k-1]==undefined){
                    continue;
                }
                nextStop=scheduleTable[i][k-1];
                if(scheduleTable[i][k]!=undefined&&compare(nextStop,scheduleTable[i][k])){
                    // Swap the entire column
                    for(let l=0;l<scheduleTable.length;l++){
                        let temp=scheduleTable[l][k];
                        scheduleTable[l][k]=scheduleTable[l][k-1];
                        scheduleTable[l][k-1]=temp;
                    }
                }else{
                    break;
                }
            }
        }
    }
    // Sort the trips using selection sort
    for(let i=0;i<scheduleTable[0].length;i++){
        for(let j=1;j<scheduleTable.length;j++){
            let lowestI=j;
            for(let k=j;k<scheduleTable.length;k++){
                if(scheduleTable[k][i]!=undefined){
                    try{
                        if(compare(scheduleTable[lowestI][i],scheduleTable[k][i])){
                            lowestI=k;
                        }
                    }catch{
                        //
                    }
                }
            }
            if(lowestI!=j){
                let temp=scheduleTable[j];
                scheduleTable[j]=scheduleTable[lowestI];
                scheduleTable[lowestI]=temp;
                temp=stoptripids[j];
                stoptripids[j]=stoptripids[lowestI];
                stoptripids[lowestI]=temp;
            }
        }
    }

    // Create a table and display the schedule
    const table=document.createElement('table');
    const stopsRow=document.createElement('tr');
    stopsRow.appendChild(document.createElement('td'));
    for(let i=0;i<scheduleTable[0].length;i++){
        let cell=document.createElement('td');
        const stop=findRow(stops,'stop_id',scheduleTable[0][i]);
        if(agency=='GO'){
            //cell.innerHTML=`#${scheduleTable[0][i]}: ${stop[stops[0].indexOf('stop_name')]}`;
            cell.innerHTML='<a href=https://transitGTA.kevinwang21.repl.co/stopschedule/?a='+agency+'&s='+stop[stops[0].indexOf('stop_id')]+`&t=${dateStr}>${scheduleTable[0][i]}: ${stop[stops[0].indexOf('stop_name')]}</a>`;
        }else{
            cell.innerHTML='<a href=https://transitGTA.kevinwang21.repl.co/stopschedule/?a='+agency+'&s='+stop[stops[0].indexOf('stop_id')]+'&t='+dateStr+'>'+stop[stops[0].indexOf('stop_name')]+'</a>';
        }
        cell.setAttribute('style','border-bottom: 1px black solid; border-right: 1px black solid; font-size: 14px');
        cell.setAttribute('class','link');
        stopsRow.appendChild(cell);
    }
    stopsRow.setAttribute('style','position: relative; background: white; z-index: 2');
    stopsRow.setAttribute('id','stopsRow');
    table.appendChild(stopsRow);
    for(let i=1;i<scheduleTable.length;i++){
        const row=document.createElement('tr');
        const trip=findRow(trips,'trip_id',stoptripids[i]);
        const tripCell=document.createElement('td');
        let routecolor=route[routes[0].indexOf('route_color')];
        if(routecolor==undefined){
            routecolor='7f7f7f';
        }
        let rgb=[parseInt(routecolor.substring(0,2),16),parseInt(routecolor.substring(2,4),16),parseInt(routecolor.substring(4,6),16)]
        let newcolor="";
        for(let i=0;i<3;i++){
            let tint=255-rgb[i];
            tint*=2/3;
            rgb[i]+=tint;
            let hex=rgb[i].toString(16);
            if(hex.length==1){
                newcolor+='0'+hex.substring(0,2);
            }else{
                newcolor+=hex.substring(0,2);
            }
        }
        let headsign=trip[trips[0].indexOf('trip_headsign')];
        if(agency=='VIA') headsign='Train #'+trip[trips[0].indexOf('trip_short_name')]+' to '+trip[trips[0].indexOf('trip_headsign')];
        tripCell.innerHTML='<a href=https://transitGTA.kevinwang21.repl.co/trip/?a='+agency+'&t='+stoptripids[i]+'>'+headsign+'</a>';
        tripCell.setAttribute('style','white-space: nowrap; border-bottom: 1px black solid; border-right: 1px black solid; font-size: 14px; position: relative; z-index: 1; background-color: #'+newcolor);
        tripCell.setAttribute('class','link trip');
        row.appendChild(tripCell);
        for(let j=0;j<scheduleTable[i].length;j++){
            const cell=document.createElement('td');
            let cellcolor='#';
            if(j%2==0){
                if(i%2==0){
                    cellcolor+='cfcfcf';
                }else{
                    cellcolor+='efefef';
                }
            }else{
                if(i%2==0){
                    cellcolor+='dfdfdf';
                }else{
                    cellcolor+='ffffff';
                }
            }
            cell.setAttribute('style','border-top: 1px black solid; border-left: 1px black solid; position: relative; z-index: 0; background-color: '+cellcolor);
            if(scheduleTable[i][j]!=undefined){
                cell.innerHTML=scheduleTable[i][j];
            }
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    const outerBox=document.createElement('div');
    outerBox.setAttribute('style','width: 90%; height: 570px; margin: auto; overflow: scroll; border: 2px black solid');
    outerBox.setAttribute('id','outerBox');
    outerBox.setAttribute('onscroll','updateDisplay()');
    outerBox.appendChild(table);
    document.body.appendChild(outerBox);
}

async function findDirections(event){
    event.preventDefault();
    document.body.appendChild(load);
    loading=3;
    let dateinput=document.getElementById('date');
    // Loop through all trips to find possible headsign directions
    const trips=await fileArray('trips');
    let input=document.getElementById('directionid');
    if(input==null){
        input=document.createElement('select');
        input.setAttribute('id','directionid');
        let label=document.createElement('label');
        label.innerHTML='<br>Choose a direction: ';
        label.setAttribute('for','directionid');
        update.appendChild(label);
        update.appendChild(input);
        let br=document.createElement('br');
        update.appendChild(br);
        let br2=document.createElement('br');
        update.appendChild(br2);
        let confirmBtn=document.createElement('button');
        confirmBtn.innerHTML='Load new schedule';
        confirmBtn.addEventListener('click',reloadSchedule);
        update.appendChild(confirmBtn);
    }else{
        input.innerHTML='';
    }
    let headsigns=[];
    let date=new Date(dateinput.value);
    const service=await findService(date);
    const routes=await fileArray('routes');
    const route=findRow(routes,'route_short_name',document.getElementById('routeid').value);
    for(let i=0;i<trips.length;i++){
        if(service.includes(trips[i][trips[0].indexOf('service_id')]) && trips[i][trips[0].indexOf('route_id')]==route[routes[0].indexOf('route_id')]){
            if(!headsigns.includes(trips[i][trips[0].indexOf('trip_headsign')])){
                headsigns.push(trips[i][trips[0].indexOf('trip_headsign')]);
                let option=document.createElement('option');
                option.innerHTML=trips[i][trips[0].indexOf('direction_id')]+' - '+trips[i][trips[0].indexOf('trip_headsign')];
                option.setAttribute('value',trips[i][trips[0].indexOf('direction_id')]);
                input.appendChild(option);
            }
        }
    }
    if(headsigns.length==0){
        let option=document.createElement('option');
        option.innerHTML='No directions found';
        option.setAttribute('value','-');
        input.appendChild(option);
    }
    loading=0;
}

async function reloadSchedule(){
    routeid=document.getElementById('routeid').value;
    dirid=document.getElementById('directionid').value;
    dateStr=document.getElementById('date').value;
    loading=3;
    if(agency=='TTC'){
        getScheduleTTC();
    }else{
        generateSchedule();
    }
}

// Update positions of top row (stops) and left column (trips) to force them to stick to the top / left of the schedule table box
function updateDisplay(){
    const ypos=document.getElementById("outerBox").scrollTop;
    document.getElementById("stopsRow").style.top=ypos+'px';
    const xpos=document.getElementById("outerBox").scrollLeft;
    const cells=document.getElementsByClassName('trip');
    for(const cell of cells){
        cell.style.left=xpos+'px';
    }
}
function updateTTC(){
    const pos=document.getElementById("outerBox").scrollTop;
    document.getElementById("stopsRow").style.top=pos+'px';
}

async function getScheduleTTC(){
    // Clear the document body and add a homepage link
    document.body.innerHTML='<a href="https://transitGTA.kevinwang21.repl.co" style="font-size: 20px; color: #ff0000">Home</a>';
    document.body.appendChild(load);
    // Get the cardinal direction corresponding to the direction id
    const currentRoute=findRow(routes,'route_short_name',routeid);
    let direction='';
    for(let i=0;i<trips.length;i++){
        if(trips[i][trips[0].indexOf('route_id')]==currentRoute[routes[0].indexOf('route_id')]
           &&trips[i][trips[0].indexOf('direction_id')]==dirid){
            const headsign=trips[i][trips[0].indexOf('trip_headsign')];
            direction=headsign.substring(0,headsign.indexOf(' - '));
            break;
        }
    }
    //console.log('a');
    request('https://retro.umoiq.com/service/publicJSONFeed?command=schedule&a=ttc&r=' + routeid).then(async (response) => {
        const json = JSON.parse(response);
        if(json.route==undefined){
            display(`Cannot find route ${routeid}`);
            loading=0;
            return;
        }
        const routesresponse=json.route;
        for (const route of routesresponse) {
            // Get only the right table for the provided date and direction
            let service=route.serviceClass;
            if(service!=serviceMap[date.getDay()]) continue;
            if(route.direction.toUpperCase()!=direction) continue;
            display(`Schedule for ${route.title} ${route.direction}bound on ${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}:`);
            // Create the table
            let table=document.createElement('table');
            let stopnames=route.header.stop;
            let head=document.createElement('tr');
            head.setAttribute('id','stopsRow');
            head.setAttribute('style','position: relative; background: white; z-index: 1');
            let stops=await fileArray('stops');
            for(const stop of stopnames){
                // Add link for the corresponding nextbus page for that stop
                let th=document.createElement('th');
                let stopid=stop.tag;
                if(stop.tag.includes('_')){
                    stopid=stop.tag.substring(0,stop.tag.indexOf('_'));
                }
                let currentStop=findRow(stops,'stop_id',stopid);
                th.innerHTML='<a href=https://transitGTA.kevinwang21.repl.co/nextbus/?a='+agency+'&s='+currentStop[stops[0].indexOf('stop_code')]+'>'+stop.content+'</a>';
                th.setAttribute('style','border-top: 1px black solid; border-left: 1px black solid; font-size: 14px; width: 50px');
                head.appendChild(th);
            }
            table.appendChild(head);
            let rows=route.tr;
            for(const row of rows){
                let times=row.stop;
                let tr=document.createElement('tr');
                for(const stop of times){
                    let td=document.createElement('td');
                    td.innerHTML=stop.content;
                    td.setAttribute('style','border-top: 1px black solid; border-left: 1px black solid; background-color: #ffeeee; z-index: 0');
                    tr.appendChild(td);
                }
                table.appendChild(tr);
            }
            const outerBox=document.createElement('div');
            outerBox.setAttribute('style','width: 90%; height: 580px; margin: auto; overflow: scroll; border: 2px black solid; position: relative')
            outerBox.setAttribute('id','outerBox');
            outerBox.setAttribute('onscroll','updateTTC()');
            //outerBox.appendChild(stopsTable);
            outerBox.appendChild(table);
            document.body.appendChild(outerBox);
            // Add link to routevehicles
            let link=document.createElement('a');
            link.setAttribute('href','https://transitGTA.kevinwang21.repl.co/routevehicles/?a=TTC&r='+routeid);
            link.innerText='Route map + vehicles on route';
            let br=document.createElement('br');
            document.body.appendChild(br);
            document.body.appendChild(link);
            // Add link to route schedule in the other direction
            let link2=document.createElement('a');
            let newdir='';
            if(dirid=='0') newdir='1';
            else newdir='0';
            link2.setAttribute('href','https://transitGTA.kevinwang21.repl.co/routeschedule/?a='+agency+'&r='+routeid+'&d='+newdir+'&t='+dateStr);
            link2.innerText='Schedule in the other direction';
            let br2=document.createElement('br');
            document.body.appendChild(br2);
            document.body.appendChild(link2);
            
            // Add selector to pick a different route
            update=document.createElement('form');
            let input=document.createElement('select');
            input.setAttribute('id','routeid');
            let defaultoption=document.createElement('option');
            defaultoption.setAttribute('value','-');
            defaultoption.innerHTML='Choose a route';
            input.appendChild(defaultoption);
            for(let i=1;i<routes.length;i++){
                let option=document.createElement('option');
                option.setAttribute('value',routes[i][routes[0].indexOf('route_short_name')]);
                option.innerHTML=routes[i][routes[0].indexOf('route_short_name')]+' '+routes[i][routes[0].indexOf('route_long_name')];
                input.appendChild(option);
            }
            input.addEventListener('change',findDirections);
            update.appendChild(input);
            let br3=document.createElement('br');
            update.appendChild(br3);
            let dateinput=document.createElement('input');
            dateinput.setAttribute('id','date');
            dateinput.setAttribute('type','date');
            dateinput.value=dateStr;
            let label=document.createElement('label');
            label.setAttribute('for','date');
            label.innerHTML='Choose a date: ';
            update.appendChild(label);
            update.appendChild(dateinput);
            let inst=document.createElement('p');
            inst.innerHTML='Get schedule for a new route';
            document.body.appendChild(inst);
            document.body.appendChild(update);
        }
        loading=0;
    });
}

async function findTrips(routeid){
    const service=await findService();
    const trips=await fileArray('trips');
    let tripids=[];
    for(let i=1;i<trips.length;i++){
        /*if(service.includes(trips[i][trips[0].indexOf('service_id')]) && trips[i][trips[0].indexOf('route_id')]==routeid){
            console.log(trips[i]);
        }*/
        if(service.includes(trips[i][trips[0].indexOf('service_id')]) && trips[i][trips[0].indexOf('route_id')]==routeid && trips[i][trips[0].indexOf('direction_id')]==dirid){
            tripids.push(trips[i][trips[0].indexOf('trip_id')]);
            //trip=trips[i];
        }
    }
    //console.log(routeid);
    //console.log(tripids);
    //console.log(service);
    /* Display current route
    const route=findRow(routes,'route_id',routeid);
    const routeName=route[routes[0].indexOf('route_long_name')]+'';
    const headsign=trip[trips[0].indexOf('trip_headsign')]+'';
    if(agency=='YRT'){
        let directions=new Map();
        directions.set('NB',['Northbound','Southbound']);
        directions.set('SB',['Northbound','Southbound']);
        directions.set('EB',['Eastbound','Westbound']);
        directions.set('WB',['Eastbound','Westbound']);
        directions.set('MO',['Morning','Afternoon']);
        directions.set('AF',['Morning','Afternoon']);
        const direction=directions.get(headsign.substring(headsign.indexOf('-')+2));
        if(direction==undefined){
            display(`Current route is ${route[routes[0].indexOf('route_short_name')]} ${routeName}`);
            console.log(headsign.substring(headsign.indexOf('-')+2));
        }else{
            display(`Current route is ${route[routes[0].indexOf('route_short_name')]} ${routeName} ${direction[dirid]}`);
        }
    }else if(agency=='MiWay'){
        display(`Current route is ${route[routes[0].indexOf('route_short_name')]} ${routeName} ${headsign}`);
    }*/
    return tripids;
}
async function findService(){
    const dateString=dateStr.split('-').join('');
    if(agency=='GO'||agency=='UPX') return [dateString];
    const cal1=await fileArray('calendar');
    const cal2=await fileArray('calendar_dates');
    let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    let serviceids = [];
    for (let i = 1; i < cal1.length; i++) {
        if (cal1[i][cal1[0].indexOf(`${days[date.getDay()]}`)] == 1 && !serviceids.includes(cal1[i][cal1[0].indexOf('service_id')])) {
            serviceids.push(cal1[i][cal1[0].indexOf('service_id')]);
        }
    }
    for (let i = 1; i < cal2.length; i++) {
        if (cal2[i][cal2[0].indexOf('date')] == dateString) {
            if(cal2[i][cal2[0].indexOf('exception_type')] == 1 && !serviceids.includes(cal2[i][cal2[0].indexOf('service_id')])){
                serviceids.push(cal2[i][cal2[0].indexOf('service_id')]);
            }else{
                serviceids.splice(serviceids.indexOf(cal2[i][cal2[0].indexOf('service_id')]),1);
            }
        }
    }
    //console.log(serviceids);
    return serviceids;
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
    return new Promise(async (resolve) => {
        const response=await request('https://gtfsgta.kevinwang21.repl.co/gtfs/'+agency+'/'+fileName+'.txt');
        const array1=response.split("\r\n");
        let array2=[];
        for(const arr of array1){
            array2.push(arr.split(','));
        }
        resolve(array2);
    });
}

function display(output='') {
    const p = document.createElement('p');
    p.innerText = output;
    document.body.appendChild(p);
}

function findRow(table=[[]], searchColName='', searchStr=''){
    for(const row of table){
        if(row[table[0].indexOf(searchColName)]==searchStr){
            return row;
        }
    }
    return [];
}

// Returns true if time1str is after time2str,
//  and false if time1str is before or the same as time2str
function compare(time1str, time2str){
    const time1strArr=time1str.split(':')
    let time1=[];
    for(const time of time1strArr){
        time1.push(parseInt(time));
    }
    const time2strArr=time2str.split(':')
    let time2=[];
    for(const time of time2strArr){
        time2.push(parseInt(time));
    }
    if (time1[0] > time2[0]) {
        return true;
    } else if (time1[0] === time2[0]) {
        if (time1[1] > time2[1]) {
            return true;
        } else if (time1[1] === time2[1]) {
            if (time1[2] > time2[2]) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
}