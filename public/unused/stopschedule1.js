document.addEventListener('DOMContentLoaded', init);

let load;
let loading=0;
function updateLoading(){
    if(loading>1){
        loading--;
        load.innerHTML+='.';
    }else if(loading==1){
        loading=3;
        load.innerHTML='Loading.';
    }else if(loading==0){
        loading=-1;
        document.body.removeChild(load);
    }
}

async function init() {
    
    // Get all url flags
    const params=new URLSearchParams(window.location.search);
    const agency=params.get('a');
    const stopid=params.get('s');
    if(stopid==undefined){
        display('No stop id provided!');
        return;
    }
    let date=new Date();
    let dateStr=params.get('t');
    if(dateStr!=undefined){
        date=new Date(dateStr);
        date.setUTCHours('5');
        if(date.toString()=='Invalid Date') date=new Date();
    }
    // Start loading sequence
    load = document.createElement('p');
    load.innerHTML='Loading.';
    document.body.appendChild(load);
    loading=3;
    setInterval(updateLoading, 1000);
    if(agency=='YRT'||agency=='MiWay'||agency=='DRT'||agency=='Brampton'||agency=='GO'||agency=='TTC'||agency=='Niagara'||agency=='Burlington'||agency=='HSR'||agency=='UPX'||agency=='Oakville'||agency=='VIA'){
        generateSchedule(agency, stopid, date);
    }else if(agency=='TTC'){
        //
    }else{
        display('Invalid agency!');
    }
}

async function generateSchedule(agency, stopid, date){
    // Get all necessary resources
    const tripids=await findTrips(agency, date);
    const routes=await fileArray(agency, 'routes');
    const trips=await fileArray(agency, 'trips');
    const stops=await fileArray(agency, 'stops');
    const times=await fileArray(agency, 'stop_times');
    // Find and display the stop
    let currentStop=[];
    for(const stop of stops){
        if(stop[stops[0].indexOf('stop_id')]==stopid){
            currentStop=stop;
            break;
        }
    }
    let stopname='';
    let isParent=false;
    let stopids=[stopid];
    let title='';
    if(currentStop.length>0){
        stopname=currentStop[stops[0].indexOf('stop_name')];
        if(agency=='GO'){
            title=`Current stop is ${stopname}`
        }else{
            title=`Current stop is #${currentStop[stops[0].indexOf('stop_code')]}: ${stopname}`
        }
    }
    // else{
    //     display('Cannot find stop with id '+stopid);
    //     loading=0;
    //     return;
    // }
    if((agency=='YRT'&&currentStop[stops[0].indexOf('stop_desc')]=='Parent station')||(agency=='Brampton'&&currentStop[stops[0].indexOf('stop_id')].includes('place'))){
        // Parent station = terminal with multiple stops inside
        //display(`Current stop is ${currentStop[stops[0].indexOf('stop_name')]}`);
        isParent=true;
        for(const stop of stops){
            if(stop[stops[0].indexOf('parent_station')]==stopid){
                stopids.push(stop[stops[0].indexOf('stop_id')]);
            }
        }
    }
    // Find all arrivals at this stop
    let c=0;
    let stoptrips=[trips[0]];
    let arrivalTimes=["0"];
    let platforms=[stops[0]];
    let isArrival=[false];
    let stoproutes=[routes[0]];
    for (let i = 1; i < times.length; i++) {
        const stop = times[i];
        if (stopids.includes(stop[times[0].indexOf('stop_id')]) && tripids.includes(stop[times[0].indexOf('trip_id')])){
            stoptrips.push(findRow(trips,'trip_id',stop[times[0].indexOf('trip_id')]));
            arrivalTimes.push(stop[times[0].indexOf('departure_time')]);
            stoproutes.push(findRow(routes,'route_id',stoptrips[stoptrips.length-1][trips[0].indexOf('route_id')]));
            isArrival.push(true);
            const afterStops=[stop];
            platforms.push(findRow(stops,'stop_id',stop[times[0].indexOf('stop_id')]));
            const sequence=parseInt(stop[times[0].indexOf('stop_sequence')]);
            // Collect all stop times for that trip
            for(let j=i-1;j>0;j--){
                if(times[j][times[0].indexOf('trip_id')]==stop[times[0].indexOf('trip_id')]){
                    const sequence2=parseInt(times[j][times[0].indexOf('stop_sequence')]);
                    if(sequence2>sequence){ // if there are stops scheduled after this one
                        afterStops.push(times[j]);
                        isArrival[c]=false;
                    }
                }else break;
            }for(let j=i+1;j<times.length;j++){
                if(times[j][times[0].indexOf('trip_id')]==stop[times[0].indexOf('trip_id')]){
                    const sequence2=parseInt(times[j][times[0].indexOf('stop_sequence')]);
                    if(sequence2>sequence){ // if there are stops scheduled after this one
                        afterStops.push(times[j]);
                        isArrival[c]=false;
                    }
                }else break;
            }
            //console.log(stoptrips[c][trips[0].indexOf('trip_headsign')]);
            //console.log(isArrival[c]);
            //console.log(afterStops);
            c++;
        }
    }
    // Sort arrival times and trips using insertion sort
    for(let i=1;i<arrivalTimes.length;i++){
        for(let j=i;j>1;j--){
            if(subtract(arrivalTimes[j-1],arrivalTimes[j])<0){
                let temp=arrivalTimes[j];
                arrivalTimes[j]=arrivalTimes[j-1];
                arrivalTimes[j-1]=temp;
                let temp2=stoptrips[j];
                stoptrips[j]=stoptrips[j-1];
                stoptrips[j-1]=temp2;
                let temp3=platforms[j];
                platforms[j]=platforms[j-1];
                platforms[j-1]=temp3;
                let temp4=isArrival[j];
                isArrival[j]=isArrival[j-1];
                isArrival[j-1]=temp4;
                let temp5=stoproutes[j];
                stoproutes[j]=stoproutes[j-1];
                stoproutes[j-1]=temp5;
            }else break;
        }
    }
    //display(arrivalTimes);
    //display(stoptrips);
    //display(platforms);

    const json={
        "agency": agency,
        "title": title,
        "stopname": stopname,
        "isParent": isParent,
        "stoptrips": stoptrips,
        "arrivalTimes": arrivalTimes,
        "stoproutes": stoproutes,
        "platforms": platforms,
        "isArrival": isArrival
    }
    
    generateTable(json);
    loading=0;
}

async function generateTable(json){
    // Get data for the stop
    let agency=json.agency;
    let title=json.title;
    let stopname=json.stopname;
    let isParent=json.isParent;
    let stoptrips=json.stoptrips;
    let arrivalTimes=json.arrivalTimes;
    let stoproutes=json.stoproutes;
    let platforms=json.platforms;
    let isArrival=json.isArrival;

    display(title);
    let h=document.getElementById('update').value;
    // Display all stops, including route and destination
    const table = document.getElementById('table');
    table.innerHTML='';
    const departures=[];
    const arrivals=[];
    const headRow=document.createElement('tr');
    const routeCell=document.createElement('td');
    const headsignCell=document.createElement('td');
    const timeCell=document.createElement('td');
    routeCell.innerHTML='Route';
    headsignCell.innerHTML='Destination';
    timeCell.innerHTML='Time';
    routeCell.style.borderRight='1px black solid';
    headsignCell.style.borderRight='1px black solid';
    timeCell.style.borderRight='1px black solid';
    headRow.appendChild(routeCell);
    headRow.appendChild(headsignCell);
    headRow.appendChild(timeCell);
    if(isParent){
        const platformCell=document.createElement('td');
        platformCell.innerHTML='Platform';
        platformCell.style.borderRight='1px black solid';
        headRow.appendChild(platformCell);
    }
    if(h==1){
        const headwayCell=document.createElement('td');
        headwayCell.innerHTML='Headway';
        headwayCell.style.borderRight='1px black solid';
        headRow.appendChild(headwayCell);
    }
    table.appendChild(headRow);
    for(let i=1;i<stoptrips.length;i++){
        const route=stoproutes[i];
        const row=document.createElement('tr');
        const routeCell=document.createElement('td');
        const headsignCell=document.createElement('td');
        const timeCell=document.createElement('td');
        const headwayCell=document.createElement('td');
        let routecolor=route[stoproutes[0].indexOf('route_color')];
        if(routecolor==undefined) routecolor='808080';
        let rgb=[parseInt(routecolor.substring(0,2),16),parseInt(routecolor.substring(2,4),16),parseInt(routecolor.substring(4,6),16)]
        let newcolor="";
        for(let i=0;i<3;i++){
            let tint=255-rgb[i];
            tint*=2/3;
            rgb[i]+=tint;
            let hex=rgb[i].toString(16);
            if(hex.length==1) newcolor+='0'+hex.substring(0,2);
            else newcolor+=hex.substring(0,2);
        }
        if(agency!='VIA') routeCell.innerHTML+=route[stoproutes[0].indexOf('route_short_name')]+' ';
        routeCell.innerHTML+=route[stoproutes[0].indexOf('route_long_name')];
        routeCell.setAttribute('style','border-top: 1px solid black; border-left: 1px solid black; background-color: #'+newcolor);
        
        if(agency=='VIA') headsignCell.innerHTML='Train #'+stoptrips[i][stoptrips[0].indexOf('trip_short_name')]+' to '+stoptrips[i][stoptrips[0].indexOf('trip_headsign')];
        else headsignCell.innerHTML=`<a href="./trip/?a=${agency}&t=${stoptrips[i][stoptrips[0].indexOf('trip_id')]}">${stoptrips[i][stoptrips[0].indexOf('trip_headsign')]}</a>`;
        headsignCell.setAttribute('style','border-bottom: 1px solid black; border-right: 1px solid black; background-color: #'+newcolor);
        
        timeCell.innerHTML=arrivalTimes[i];
        timeCell.setAttribute('style','border-top: 1px solid black; border-left: 1px solid black; background-color: #dddddd');
        
        if(i==0){
            headwayCell.setAttribute('style','border-top: 1px solid black; border-left: 1px solid black; background-color: #dddddd');
        }else{
            let diff=subtract(arrivalTimes[i-1],arrivalTimes[i]);
            let hrDiff=0;
            let minDiff=0;
            let secDiff=0;
            while(diff>=3600){
                hrDiff++;
                diff-=3600;
            }while(diff>=60){
                minDiff++;
                diff-=60;
            }secDiff=diff;
            /*let hrDiff=Math.floor(diff/3600);
            let minDiff=Math.floor(diff/60);
            let secDiff=diff%60;*/
            if(secDiff<10) secDiff='0'+secDiff;
            if(minDiff<10) minDiff='0'+minDiff;
            if(hrDiff<10) hrDiff='0'+hrDiff;
            headwayCell.innerHTML=hrDiff+':'+minDiff+':'+secDiff;
            headwayCell.setAttribute('style','border-top: 1px solid black; border-left: 1px solid black; background-color: #dddddd');
        }
        row.appendChild(routeCell);
        row.appendChild(headsignCell);
        row.appendChild(timeCell);
        if(isParent){
            const platformCell=document.createElement('td');
            let platformFullName=platforms[i][platforms[0].indexOf('stop_name')];
            let platformName=platformFullName.substring(stopname.length);
            platformCell.innerHTML=`<a href="./stopschedule/?a=${agency}&s=${platforms[i][platforms[0].indexOf('stop_id')]}">#${platforms[i][platforms[0].indexOf('stop_id')]} ${platformName}</a>`;
            platformCell.setAttribute('style','border-bottom: 1px solid black; border-right: 1px solid black; background-color: #eeeeee');
            row.appendChild(platformCell);
        }
        if(h==1) row.appendChild(headwayCell);
        if(h==2){
            if(isArrival[i]){
                arrivals.push(row);
            }else{
                departures.push(row);
            }
        }else{
            table.appendChild(row);
        }
        //const sender=`${route[routes[0].indexOf('route_short_name')]} ${route[routes[0].indexOf('route_long_name')]} towards ${stoptrips[i][trips[0].indexOf('trip_headsign')]} at ${arrivalTimes[i]}`;
        //display(sender);
    }
    if(h==2){
        // Add departures to the table
        const departureRow=document.createElement('tr');
        const departureCell=document.createElement('td');
        departureCell.innerHTML='Departures';
        departureCell.setAttribute('colspan',5);
        departureCell.setAttribute('style','border-bottom: 1px solid black; background-color: #eeeeee');
        departureRow.appendChild(departureCell);
        table.appendChild(departureRow);
        for(const row of departures){
            table.appendChild(row);
        }
        // Add arrivals to the table
        const arrivalRow=document.createElement('tr');
        const arrivalCell=document.createElement('td');
        arrivalCell.innerHTML='Arrivals';
        arrivalCell.setAttribute('colspan',5);
        arrivalCell.setAttribute('style','border-bottom: 1px solid black; background-color: #eeeeee');
        arrivalRow.appendChild(arrivalCell);
        if(arrivals.length>0) table.appendChild(arrivalRow);
        for(const row of arrivals){
            table.appendChild(row);
        }
    }
}

async function findTrips(agency, date){
    const localDate=new Date(date-date.getTimezoneOffset()*60000);
    const dateStr = localDate.toISOString().substring(0, 10).split('-').join('');
    if(agency=='GO'||agency=='UPX') return dateStr;
    const cal1=await fileArray(agency, 'calendar');
    const cal2=await fileArray(agency, 'calendar_dates');
    let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    let serviceids = [];
    for (let i = 1; i < cal1.length; i++) {
        if (cal1[i][cal1[0].indexOf(`${days[date.getDay()]}`)] == 1 && !serviceids.includes(cal1[i][cal1[0].indexOf('service_id')])) {
            serviceids.push(cal1[i][cal1[0].indexOf('service_id')]);
        }
    }
    for (let i = 1; i < cal2.length; i++) {
        if (cal2[i][cal2[0].indexOf('date')] == dateStr) {
            if(cal2[i][cal2[0].indexOf('exception_type')] == 1 && !serviceids.includes(cal2[i][cal2[0].indexOf('service_id')])){
                serviceids.push(cal2[i][cal2[0].indexOf('service_id')]);
            }else{
                serviceids.splice(serviceids.indexOf(cal2[i][cal2[0].indexOf('service_id')]),1);
            }
        }
    }
    //console.log(dateStr);
    const trips=await fileArray(agency, 'trips');
    let tripids=[];
    for(let i=1;i<trips.length;i++){
        if(serviceids.includes(trips[i][trips[0].indexOf('service_id')])){
            tripids.push(trips[i][trips[0].indexOf('trip_id')]);
        }
    }
    return tripids;
}

async function request(url) {
    let str='';
    let request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'text';
    request.onload = function () { str+=request.response; };
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

async function fileArray(agency, fileName){
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
        if(row[table[0].indexOf(searchColName)]==searchStr) return row;
    }
    return [];
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
    } return hrDiff*3600+minDiff*60+secDiff;
}