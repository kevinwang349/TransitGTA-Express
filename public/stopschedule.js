
async function generateTable(){
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
        
        if(i==1){
            headwayCell.setAttribute('style','border-top: 1px solid black; border-left: 1px solid black; background-color: #dddddd');
        }else{
            let diff=subtract(arrivalTimes[i-1],arrivalTimes[i]);
            let hrDiff=diff.hrDiff;
            let minDiff=diff.minDiff;
            let secDiff=diff.secDiff;
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
            if(isArrival[i] == 'true'){
                arrivals.push(row);
            }else{
                departures.push(row);
            }
        }else{
            table.appendChild(row);
        }
        //const sender=`${route[stoproutes[0].indexOf('route_short_name')]} ${route[stoproutes[0].indexOf('route_long_name')]} towards ${stoptrips[i][stoptrips[0].indexOf('trip_headsign')]} at ${arrivalTimes[i]}`;
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
    if(stoptrips.length==1){
        const errorRow=document.createElement('p');
        errorRow.innerHTML='There are no buses at this stop today.';
        errorRow.style.fontSize='30px';
        table.appendChild(errorRow);
    }
}

function display(output='') {
    const p = document.createElement('p');
    p.innerText = output;
    document.body.appendChild(p);
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
    }
    return { "hrDiff": hrDiff, "minDiff": minDiff, "secDiff": secDiff };
}

generateTable();