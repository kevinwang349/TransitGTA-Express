import express, { static as _static } from "express";
import { readFileSync } from 'fs';
import fetch from 'node-fetch';
const app = express();

import { decode, formatGTFS } from './protodecoder.js';

// setting application's templating engine to ejs
app.set("view engine", "ejs");

app.use(_static('public'));

app.get("/", (req, res) => { // root directory ==> main navigation map
    res.render("pages/home");
});
app.get("/home", (req, res) => {
    res.render("pages/home");
});

app.get("/:agency/routelist", (req, res) => {
    const agency = req.params.agency;
    const routes = fileArray(agency, 'routes');
    const json = {
        title: `List of routes for agency ${agency}`,
        agency: agency,
        routes: []
    }
    for (let i = 1; i < routes.length; i++) {
        const route = {
            shortname: routes[i][routes[0].indexOf('route_short_name')],
            name: routes[i][routes[0].indexOf('route_short_name')] + " " + routes[i][routes[0].indexOf('route_long_name')],
            color: "#" + tint(routes[i][routes[0].indexOf('route_color')])
        };
        json.routes.push(route);
    }
    res.render("pages/routelist", json);
});

app.get("/:agency/routevehicles", async (req, res) => {
    const agency = req.params.agency;
    const routeShortId = req.query.r;
    const routes = fileArray(agency, 'routes');
    const route = findRow(routes, 'route_short_name', routeShortId);
    const routeid=route[routes[0].indexOf('route_id')];
    const trips = fileArray(agency, 'trips');

    // TTC only -- use client-side JS
    if(agency == 'TTC'){
        const json = {
            title: `Vehicles on route ${route[routes[0].indexOf('route_long_name')]}`,
            agency: 'TTC',
            routeid: routeShortId
        }
        res.render("pages/routevehicles", json);
        return;
    }else if(agency == 'VIA'){
        res.send("Route vehicles does not work with VIA Rail");
        return;
    }

    // Fetch vehicles on the route
    const urls = JSON.parse(readFileSync('./URL.json'));
    const VPurl = urls[agency].vehiclePositions;
    let allVehicles = [];
    await fetch(VPurl).then(async (response) => {
        if(agency == 'GO'){
            const gtfs=await response.json();
            allVehicles = gtfs.entity;
        }else{
            const buffer = await response.buffer();
            const hex = buffer.toString('hex').split('');
            let str = '';
            let c = 0;
            for (const char of hex) {
                c++;
                str += char;
                if (c % 2 == 0) {
                    str += ' ';
                }
            }
            const protobufferarr = str.split(' ');
            const gtfs = decode(protobufferarr, formatGTFS);
            allVehicles = gtfs.entity;
        }
    }).catch(() => {});
    let vehicles = [];
    let vehicleTrips = [trips[0]];
    for(const v of allVehicles){
        if(v.vehicle.trip.route_id == routeid){
            const trip = findRow(trips, 'trip_id', v.vehicle.trip.trip_id);
            vehicles.push(v);
            vehicleTrips.push(trip);
        }
    }
    // GO Transit only -- get ServiceataGlance data
    let serviceataGlance = {};
    if(agency == 'GO'){
        const urls = JSON.parse(readFileSync('./URL.json'));
        const VPurl = urls[agency].serviceataGlance;
        await fetch(VPurl).then(async (response) => {
            const trips=await response.json();
            serviceataGlance = trips.Trips.Trip;
        });
    }

    // Get shapes for the route
    const shapes = fileArray(agency, 'routeshapes', true);
    let routeshapes = [];
    for (let i=1;i<shapes.length;i++) {
        if(shapes[i][0]==route[routes[0].indexOf('route_short_name')]){
            routeshapes.push(shapes[i].slice(1,3));
        }
    }

    // Get stops on the route
    const stops = fileArray(agency, 'stops');
    let routestops=[stops[0]];
    const allroutestops = fileArray(agency, 'routestops');
    for(let i=1;i<allroutestops.length;i++){
        if(allroutestops[i][allroutestops[0].indexOf('route_id')]==route[routes[0].indexOf('route_id')]){
            routestops.push(allroutestops[i].slice(2));
        }
    }

    if(route[routes[0].indexOf('route_color')]==undefined){
        routes[0].push('route_color');
        route.push('808080');
    }
    
    const json = {
        title: `Vehicles on route ${route[routes[0].indexOf('route_long_name')]}`,
        agency: agency,
        routeLegend: routes[0].join(','),
        route: route.join(','),
        vehicles: JSON.stringify(vehicles),
        serviceataGlance: JSON.stringify(serviceataGlance),
        stops: arrayStr(routestops),
        trips: arrayStr(vehicleTrips),
        shapes: arrayStr(routeshapes)
    }
    res.render("pages/routevehicles", json);
});

app.get("/:agency/routeschedule", async (req, res) => {
    const agency = req.params.agency;
    // Load appropriate files
    const routes = fileArray(agency, 'routes');
    const trips = fileArray(agency, 'trips');

    // Get URL flags
    const routeShortId = req.query.r;
    const route = (agency=='VIA')?findRow(routes, 'route_id', routeShortId):findRow(routes, 'route_short_name', routeShortId);
    let dirid = req.query.d;
    if(dirid==undefined){
        dirid=0;
    }
    let date=new Date();
    let dateStr=req.query.t;
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

    const serviceids = findService(agency,date);
    let tripids=[];
    for(let i=1;i<trips.length;i++){
        if(serviceids.includes(trips[i][trips[0].indexOf('service_id')]) && trips[i][trips[0].indexOf('route_id')]==route[routes[0].indexOf('route_id')] && trips[i][trips[0].indexOf('direction_id')]==dirid){
            tripids.push(trips[i][trips[0].indexOf('trip_id')]);
        }
    }
    //console.log(tripids);
    /*if(tripids.length==0){
        display(`Sorry, there is no service on route ${routeid} ${route[routes[0].indexOf('route_long_name')]} on ${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}.`);
        loading=0;
        return;
    }*/

    // Create schedule table using stop times
    let scheduleTable=[[]];
    let stoptripids=[''];
    const times = fileArray(agency, 'stop_times');
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
                        if(scheduleTable[lowestI][i]!=undefined && compare(scheduleTable[lowestI][i],scheduleTable[k][i])){
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
    // Collect stop names and trip headsigns
    let stopnames=[];
    let headsigns=[];
    const stops = fileArray(agency, 'stops');
    for(let j=0;j<scheduleTable[0].length;j++){
        const currentstop = findRow(stops, 'stop_id', scheduleTable[0][j]);
        stopnames.push(currentstop[stops[0].indexOf('stop_name')]);
    }
    for(let j=0;j<stoptripids.length;j++){
        const trip=findRow(trips,'trip_id',stoptripids[j]);
        if(agency=='VIA') headsigns.push('Train #'+trip[trips[0].indexOf('trip_short_name')]+' to '+trip[trips[0].indexOf('trip_headsign')]);
        else headsigns.push(trip[trips[0].indexOf('trip_headsign')]);
    }
    // Set alternating grid colors for schedule table
    let colors=[[]];
    for(let i=1;i<scheduleTable.length;i++){
        colors.push([]);
        for(let j=0;j<scheduleTable[i].length;j++){
            if(i%2==0 && j%2==0) colors[i].push('cfcfcf');
            else if(i%2==1 && j%2==0) colors[i].push('dfdfdf');
            else if(i%2==0 && j%2==1) colors[i].push('efefef');
            else colors[i].push('ffffff');
        }
    }
    // Send schedule table to client
    const reverseDir = (dirid==0)?1:0;
    const rsn = (agency!='VIA')?route[routes[0].indexOf('route_short_name')]:route[routes[0].indexOf('route_id')];
    const json={
        title: `Schedule for route ${route[routes[0].indexOf('route_short_name')]} ${route[routes[0].indexOf('route_long_name')]} on ${date.toDateString()}:`,
        agency: agency,
        routeshortname: rsn,
        routes: routes,
        routecolor: tint(route[routes[0].indexOf('route_color')]),
        schedule: scheduleTable,
        colors: colors,
        stopnames: stopnames,
        tripids: stoptripids,
        headsigns: headsigns,
        dateStr: dateStr,
        reverseDir: reverseDir
    }
    res.render("pages/routeschedule",json);
    //res.send(json);
});
// Returns true if time1str is after time2str,
//  and false if time1str is before or the same as time2str
function compare(time1str, time2str){
    let time1=[];
    let time2=[];
    try{
        const time1strArr=time1str.split(':')
        for(const time of time1strArr){
            time1.push(parseInt(time));
        }
        const time2strArr=time2str.split(':')
        for(const time of time2strArr){
            time2.push(parseInt(time));
        }
    }catch(e){
        console.log(time1str);
        console.log(time2str);
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

app.get("/:agency/stopschedule", async (req, res) => {
    const agency = req.params.agency;
    // Get all necessary resources
    const routes = fileArray(agency, 'routes');
    const trips = fileArray(agency, 'trips');
    const stops = fileArray(agency, 'stops');
    const times = fileArray(agency, 'stop_times');

    // Get parameters
    const stopid = req.query.s;
    let date=new Date();
    let dateStr=req.query.t;
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

    // Get trip ids in service on requested date
    const serviceids = findService(agency,date);
    let tripids=[];
    for(let i=1;i<trips.length;i++){
        if(serviceids.includes(trips[i][trips[0].indexOf('service_id')])){
            tripids.push(trips[i][trips[0].indexOf('trip_id')]);
        }
    }

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
        if(agency=='GO' && currentStop[stops[0].indexOf('stop_code')]==''){
            title=`Current station is ${stopname}`
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
    let c=1;
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
        "stopid": stopid,
        "isParent": isParent,
        "stoptrips": arrayStr(stoptrips),
        "arrivalTimes": arrivalTimes.join(','),
        "stoproutes": arrayStr(stoproutes),
        "platforms": arrayStr(platforms),
        "isArrival": isArrival.join(',')
    }
    res.render("pages/stopschedule",json);
});
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

app.get("/:agency/nextbus", async (req, res) => {
    const agency = req.params.agency;
    const stopid = req.query.s;
    if(agency=='TTC') {
        nextPrediction(stopid,res);
        return;
    }
    // Get all url flags
    const routelist = req.query.r; // filter by routes
    let routeids=[];
    if(routelist!=undefined&&routelist.length>0){
        routeids=routelist.split(',');
    }
    let n=5;
    let N = req.query.n // number of predictions
    if(N!=undefined && N>0){
        n=N;
    }

    // Get all necessary resources
    const times = fileArray(agency, 'stop_times');
    const trips = fileArray(agency, 'trips');
    const stops = fileArray(agency, 'stops');
    const routes = fileArray(agency, 'routes');
    if(routeids.length==0){ // If no route filter selected, add all route ids to the routeids filter
        for(let i=0;i<routes.length;i++){
            routeids.push(routes[i][routes[0].indexOf('route_id')]);
        }
    }
    // Find and display the stop
    let currentStop=findRow(stops,'stop_id',stopid);
    let stopids=[stopid];
    let title='';
    if(currentStop.length>0){
        const stopname=currentStop[stops[0].indexOf('stop_name')];
        if(agency=='GO' && currentStop[stops[0].indexOf('stop_code')]==''){
            title=`Current station is ${stopname}`
        }else{
            title=`Current stop is #${currentStop[stops[0].indexOf('stop_code')]}: ${stopname}`
        }
    }
    // else{
    //     display('Cannot find stop with id '+stopid);
    //     loading=0;
    //     return;
    // }
    if(currentStop[stops[0].indexOf('stop_desc')]=='Parent station'){
        // Parent station = terminal with multiple stops inside
        //display(`Current stop is ${currentStop[stops[0].indexOf('stop_name')]}`);
        for(const stop of stops){
            if(stop[stops[0].indexOf('parent_station')]==stopid){
                stopids.push(stop[stops[0].indexOf('stop_id')]);
            }
        }
    }
    // Get all service ids
    const service = findService(agency);
    let tripids=[];
    for(let i=1;i<trips.length;i++){
        if(service.includes(trips[i][trips[0].indexOf('service_id')]) && routeids.includes(trips[i][trips[0].indexOf('route_id')])){
            tripids.push(trips[i][trips[0].indexOf('trip_id')]);
        }
    }
    //console.log(tripids.length);
    // Find all arrivals at this stop
    let allArrivalTimes=[""];
    let allstoptrips=[trips[0]];
    let allstoproutes=[routes[0]];
    let allplatforms=[stops[0]];
    for (let i = 1; i < times.length; i++) {
        const stop = times[i];
        if (stopids.includes(stop[times[0].indexOf('stop_id')]) && tripids.includes(stop[times[0].indexOf('trip_id')])){
            allArrivalTimes.push(stop[times[0].indexOf('departure_time')]);
            allstoptrips.push(findRow(trips,'trip_id',stop[times[0].indexOf('trip_id')]));
            allplatforms.push(findRow(stops,'stop_id',stop[times[0].indexOf('stop_id')]));
            allstoproutes.push(findRow(routes,'route_id',allstoptrips[allstoptrips.length-1][trips[0].indexOf('route_id')]));
        }
    }
    //console.log(allArrivalTimes);
    // Get the current time
    const date=new Date();
    date.setUTCHours(date.getUTCHours()-5);
    let mins=date.getMinutes();
    let secs=date.getSeconds();
    if(mins<10){
        mins='0'+mins;
    }if(secs<10){
        secs='0'+secs;
    }
    const currentTime=date.getHours()+':'+mins+':'+secs;
    //console.log(date);
    //console.log(currentTime);
    // Sort arrival times and trips using selection sort
    let arrivalTimes=[""];
    let stoptrips=[trips[0]];
    let platforms=[stops[0]];
    let stoproutes=[routes[0]];
    let colors=[""];
    for(let h=1;h<=n;h++){
        arrivalTimes.push("23:59:59");
        stoptrips.push([]);
        platforms.push([]);
        stoproutes.push([]);
        colors.push("");
        for(let i=1;i<allArrivalTimes.length;i++){
            if(compare(allArrivalTimes[i], currentTime) && compare(arrivalTimes[h], allArrivalTimes[i])){
                if(h==1 || (h>1 && compare(allArrivalTimes[i], arrivalTimes[h-1]))){
                    arrivalTimes[h]=allArrivalTimes[i];
                    stoptrips[h]=allstoptrips[i];
                    platforms[h]=allplatforms[i];
                    stoproutes[h]=allstoproutes[i];
                    colors[h]=tint(stoproutes[h][routes[0].indexOf('route_color')]);
                }
            }
        }
        if(arrivalTimes[h]=='23:59:59'){
            arrivalTimes=arrivalTimes.slice(0,-1);
            break;
        }
    }
    //console.log(stoptrips);

    // Get vehicles for each arrival from vehiclePositions
    const urls = JSON.parse(readFileSync('./URL.json'));
    const VPurl = urls[agency].vehiclePositions;
    let allVehicles = [{}];
    await fetch(VPurl).then(async (response) => {
        if(agency == 'GO'){
            const gtfs=await response.json();
            allVehicles = gtfs.entity;
        }else{
            const buffer = await response.buffer();
            const hex = buffer.toString('hex').split('');
            let str = '';
            let c = 0;
            for (const char of hex) {
                c++;
                str += char;
                if (c % 2 == 0) {
                    str += ' ';
                }
            }
            const protobufferarr = str.split(' ');
            const gtfs = decode(protobufferarr, formatGTFS);
            allVehicles = gtfs.entity;
        }
    }).catch(() => {});
    let vehicles = [{}];
    let vehids = [''];
    for(let i=1;i<arrivalTimes.length;i++){
        for(const v of allVehicles){
            if(v.vehicle.trip.trip_id == stoptrips[i][trips[0].indexOf('trip_id')]){
                vehicles.push(v.vehicle);
                vehids.push(v.vehicle.vehicle.id);
                break;
            }
        }
        if(vehicles.length<=i) {vehicles.push({}); vehids.push('')}
    }

    // Get real-time predicted arrival times from tripUpdates
    const TUurl = urls[agency].tripUpdates;
    let allTripUpdates = [{}];
    await fetch(TUurl).then(async (response) => {
        if(agency == 'GO'){
            const gtfs=await response.json();
            allTripUpdates = gtfs.entity;
        }else{
            const buffer = await response.buffer();
            const hex = buffer.toString('hex').split('');
            let str = '';
            let c = 0;
            for (const char of hex) {
                c++;
                str += char;
                if (c % 2 == 0) {
                    str += ' ';
                }
            }
            const protobufferarr = str.split(' ');
            const gtfs = decode(protobufferarr, formatGTFS);
            allTripUpdates = gtfs.entity;
        }
    }).catch(() => {});
    //let updates=[{}]; // for testing only
    let actualTimes=[""];
    for (let i = 1; i < arrivalTimes.length; i++) {
        for (const u of allTripUpdates) {
            if (u.trip_update.trip.trip_id == stoptrips[i][trips[0].indexOf('trip_id')]) {
                try{
                    for (const stoptime of u.trip_update.stop_time_update) {
                        if (stoptime.stop_id == platforms[i][stops[0].indexOf('stop_id')]) {
                            let sender = "";
                            if (stoptime.departure != undefined && stoptime.departure.time != undefined) {
                                const newtime = stoptime.departure.time;
                                const date = new Date(newtime * 1000);
                                date.setUTCHours(date.getUTCHours()-5);
                                sender = date.getHours() + ":";
                                let mins = date.getMinutes();
                                if (mins < 10) {
                                    sender += "0" + mins;
                                } else {
                                    sender += mins;
                                } sender += ":";
                                let secs = date.getSeconds();
                                if (secs < 10) {
                                    sender += "0" + secs;
                                } else {
                                    sender += secs;
                                }
                            }
                            actualTimes.push(sender);
                            break;
                        }
                    }
                    //updates.push(u.trip_update) // for testing only
                    break;
                }catch(e){
                    console.log(u.trip_update);
                }
            }
        }
        if(actualTimes.length<=i) actualTimes.push('');
    }

    const json={
        "agency": agency,
        "title": title,
        "stopid": stopid,
        "arrivalTimes": arrivalTimes,
        "stoptrips": stoptrips,
        "stoproutes": stoproutes,
        "stoproutesStr": arrayStr(stoproutes),
        "platforms": platforms,
        "vehicleIDs": vehids,
        "vehicles": JSON.stringify(vehicles),
        "actualTimes": actualTimes,
        "tintedColors": colors,
        "currentStop": currentStop,
        "stopsLegend": stops[0]
    };
    res.render("pages/nextbus", json);
    console.log(allVehicles);

    //res.send(json);
    /*console.log(stopid);
    console.log(arrivalTimes);
    console.log(stoptrips);
    console.log(stoproutes);
    console.log(platforms);
    console.log(vehicles);
    console.log(updates);
    console.log(actualTimes);*/
});
async function nextPrediction(stopid,res){
    // Get all necessary resources
    const stops=fileArray('TTC','stops');
    /* If no route filter selected, add all route ids to the routeids filter
    const routes=fileArray('routes');
    for(let i=0;i<routes.length;i++){
        routeids.push(routes[i][routes[0].indexOf('route_id')]);
    }*/
    // Find and display the stop
    let currentStop=findRow(stops,'stop_id',stopid);
    const title = 'Current stop is #'+currentStop[stops[0].indexOf('stop_code')]+' '+currentStop[stops[0].indexOf('stop_name')];
    let directionNames=[];
    let directionArrivals=[];
    let vehicles=[];
    let i=0;
    await fetch('https://retro.umoiq.com/service/publicJSONFeed?command=predictions&a=ttc&stopId=' + currentStop[stops[0].indexOf('stop_code')]).then(async (response) => {
        const predictionsjson=await response.json();
        let predictions=predictionsjson.predictions;
        if(predictionsjson.Error!=undefined){
            res.send(predictionsjson.Error.content);
            return;
        }
        if(predictions.length==undefined){
            predictions=[predictions];
        }
        for(const prediction of predictions){
            if(prediction.dirTitleBecauseNoPredictions!=undefined){
                directionNames.push(prediction.dirTitleBecauseNoPredictions+':');
                directionArrivals.push([]);
                continue;
            }
            let directions=prediction.direction;
            if(directions.length==undefined){
                directions=[directions];
            }
            for(const direction of directions){
                directionNames.push(direction.title+':');
                let times=direction.prediction;
                if(times.length==undefined){
                    times=[times];
                }
                directionArrivals.push([]);
                vehicles.push([]);
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
                    // Add the vehicle to the map
                    await fetch('https://retro.umoiq.com/service/publicJSONFeed?command=vehicleLocation&a=ttc&v='+time.vehicle).then(async (response) => {
                        const vehjson=await response.json();
                        const vehicle=vehjson.vehicle;
                        vehicle.tripid=time.tripTag;
                        vehicle.route=direction.title;
                        vehicle.arrival=sender;
                        vehicles[i].push(vehicle);
                    });
                    if(parseInt(time.vehicle)<5000 && parseInt(time.vehicle)>4000){
                        directionArrivals[i].push('Streetcar #'+time.vehicle+' '+sender);
                    }else{
                        directionArrivals[i].push('Bus #'+time.vehicle+' '+sender);
                    }
                }
                i++;
            }
        }
    });
    setTimeout(() => {
        // Send data
        const json={
            "title": title,
            "currentStop": currentStop,
            "stopsLegend": stops[0],
            "stopid": stopid,
            "directionNames": directionNames,
            "directionArrivals": directionArrivals,
            "vehicles": JSON.stringify(vehicles)
        };
        res.render('pages/nextbusTTC',json);
        //res.send(json);
    },2000);
}


app.get("/:agency/trip", async (req, res) => {
    const agency = req.params.agency;
    const tripid = req.query.t;
    // Load necessary files
    const times = fileArray(agency, 'stop_times');
    const shapes = fileArray(agency, 'shapes');
    const trips = fileArray(agency, 'trips');
    const stops = fileArray(agency, 'stops');
    const routes = fileArray(agency, 'routes');
    const currentTrip=findRow(trips,'trip_id',tripid);
    /*if(currentTrip.length==0){
        display('Cannot find trip with id '+tripid);
        loading=0;
        return;
    }*/
    const currentRoute=findRow(routes,'route_id',currentTrip[trips[0].indexOf('route_id')])
    let tripstops=[stops[0]];
    let arrivalTimes=[""];
    for(let i=1;i<times.length;i++){
        const stop = times[i];
        if (stop[times[0].indexOf('trip_id')] == tripid){
            tripstops.push(findRow(stops,'stop_id',stop[times[0].indexOf('stop_id')]));
            arrivalTimes.push(stop[times[0].indexOf('departure_time')]);
        }
    }
    // Sort arrival times and stops using insertion sort
    for(let i=1;i<arrivalTimes.length;i++){
        for(let j=i;j>0;j--){
            if(compare(arrivalTimes[j-1],arrivalTimes[j])){
                let temp=arrivalTimes[j];
                arrivalTimes[j]=arrivalTimes[j-1];
                arrivalTimes[j-1]=temp;
                let temp2=tripstops[j];
                tripstops[j]=tripstops[j-1];
                tripstops[j-1]=temp2;
            }else{
                break;
            }
        }
    }
    // Add the trip's shape to the map
    let shape=[];
    const shapeid=currentTrip[trips[0].indexOf('shape_id')];
    for(let i=1;i<shapes.length;i++){
        if(shapes[i][shapes[0].indexOf('shape_id')]==shapeid){
            shape.push(shapes[i].slice(1,3));
        }
    }
    let color=currentRoute[routes[0].indexOf('route_color')];
    if(color==undefined){
        color='dedede';
    }

    if(agency=='TTC'){ // cannot find real-time trip or vehicle data for TTC (for now)
        const title = `Current trip is on route ${currentRoute[routes[0].indexOf('route_short_name')]} ${currentRoute[routes[0].indexOf('route_long_name')]} towards ${currentTrip[trips[0].indexOf('trip_headsign')]} from ${arrivalTimes[1]} to ${arrivalTimes[arrivalTimes.length-1]}`;
        const json={
            "agency": agency,
            "title": title,
            "colors": [],
            "arrivalTimes": arrivalTimes,
            "tripFound": false,
            "actualTimes": [],
            "tripstops": tripstops,
            "tripStopsStr": arrayStr(tripstops),
            "routecolor": color,
            "vehicleFound": false,
            "popup": "",
            "shape": arrayStr(shape),
            "vehicle": "{}"
        };
        res.render("pages/trip", json);
        return;
    }

    const urls = JSON.parse(readFileSync('./URL.json'));
    // Look for the trip's vehicle in vehiclePositions
    const VPurl = urls[agency].vehiclePositions;
    let allVehicles = [{}];
    await fetch(VPurl).then(async (response) => {
        if(agency == 'VIA'){
            allVehicles=await response.json();
        }else if(agency == 'GO'){
            const gtfs=await response.json();
            allVehicles = gtfs.entity;
        }else{
            const buffer = await response.buffer();
            const hex = buffer.toString('hex').split('');
            let str = '';
            let c = 0;
            for (const char of hex) {
                c++;
                str += char;
                if (c % 2 == 0) {
                    str += ' ';
                }
            }
            const protobufferarr = str.split(' ');
            const gtfs = decode(protobufferarr, formatGTFS);
            allVehicles = gtfs.entity;
        }
    }).catch(() => {});
    let vehicle={};
    let vehicleFound=false;
    let popup='';
    if(agency=='VIA'){
        let tripFound=false;
        let actualTimes=[""];
        let colors=[""];
        const trainNum = currentTrip[trips[0].indexOf('trip_short_name')];
        if(allVehicles[trainNum] != undefined && allVehicles[trainNum].departed!=allVehicles[trainNum].arrived){
            vehicle = allVehicles[trainNum];
            vehicleFound=true;
            tripFound=true;
            for(const stop of vehicle.times){
                const estimated = new Date(stop.estimated);
                estimated.setUTCHours(estimated.getUTCHours()-5);
                const hrs = (estimated.getHours()<10) ? "0"+estimated.getHours() : ""+estimated.getHours()
                const mins = (estimated.getMinutes()<10) ? "0"+estimated.getMinutes() : ""+estimated.getMinutes()
                const secs = (estimated.getSeconds()<10) ? "0"+estimated.getSeconds() : ""+estimated.getSeconds()
                const time = hrs+":"+mins+":"+secs;
                actualTimes.push(time);
                if(stop.diff=='goo'){
                    colors.push('aaffaa')
                }else if(stop.diff=='med'){
                    colors.push('ffffaa')
                }else{
                    colors.push('ffaaaa')
                }
            }
        }
        popup=`Train #${trainNum} on route ${currentRoute[routes[0].indexOf('route_short_name')]} ${currentRoute[routes[0].indexOf('route_long_name')]}`;
        const title = `Current trip is train #${trainNum} towards ${currentTrip[trips[0].indexOf('trip_headsign')]} from ${arrivalTimes[1]} to ${arrivalTimes[arrivalTimes.length-1]}`;
        const json={
            "agency": agency,
            "title": title,
            "colors": colors,
            "arrivalTimes": arrivalTimes,
            "tripFound": tripFound,
            "actualTimes": actualTimes,
            "tripstops": tripstops,
            "tripStopsStr": arrayStr(tripstops),
            "routecolor": color,
            "vehicleFound": vehicleFound,
            "popup": popup,
            "shape": arrayStr(shape),
            "vehicle": JSON.stringify(vehicle)
        };
        res.render("pages/trip", json);
        return;
    }else{
        for(const entity of allVehicles){
            const v=entity.vehicle;
            if(v.trip.trip_id==tripid){
                vehicleFound=true;
                popup=`Vehicle ${v.vehicle.id} on route ${currentRoute[routes[0].indexOf('route_short_name')]} ${currentRoute[routes[0].indexOf('route_long_name')]}`;
                vehicle=v;
                break;
            }
        }
    }

    // Get real-time predicted arrival times from tripUpdates
    const TUurl = urls[agency].tripUpdates;
    let allTripUpdates = [{}];
    await fetch(TUurl).then(async (response) => {
        if(agency == 'GO'){
            const gtfs=await response.json();
            allTripUpdates = gtfs.entity;
        }else{
            const buffer = await response.buffer();
            const hex = buffer.toString('hex').split('');
            let str = '';
            let c = 0;
            for (const char of hex) {
                c++;
                str += char;
                if (c % 2 == 0) {
                    str += ' ';
                }
            }
            const protobufferarr = str.split(' ');
            const gtfs = decode(protobufferarr, formatGTFS);
            allTripUpdates = gtfs.entity;
        }
    }).catch(() => {});
    // Look for the trip in tripUpdates
    let update={};
    let tripFound=false;
    let actualTimes=[""];
    let colors=[""];
    for(const entity of allTripUpdates){
        if(entity.trip_update.trip.trip_id==tripid){
            update=entity.trip_update;
            try{
                for(let i=1;i<tripstops.length;i++){
                    let stopfound=false;
                    for(const stoptime of update.stop_time_update){
                        if(tripstops[i][tripstops[0].indexOf('stop_id')] == stoptime.stop_id){
                            const newtime=stoptime.departure.time;
                            const date=new Date(newtime*1000);
                            date.setUTCHours(date.getUTCHours()-5);
                            let sender=date.getHours()+":";
                            let mins=date.getMinutes();
                            if(mins<10){
                                sender+="0"+mins;
                            }else{
                                sender+=mins;
                            }sender+=":";
                            let secs=date.getSeconds();
                            if(secs<10){
                                sender+="0"+secs;
                            }else{
                                sender+=secs;
                            }
                            actualTimes.push(sender);
                            const roundedTime=arrivalTimes[i];
                            const diff = subtract(roundedTime,sender);
                            if(diff > 300){
                                colors.push('ffaaaa');
                            }else if(diff < -300){
                                colors.push('aaffaa');
                            }else{
                                colors.push('eeeeee');
                            }
                            stopfound=true;
                            break;
                        }
                    }
                    if(!stopfound){
                        actualTimes.push("-");
                        colors.push('ffffff');
                    }
                }
            }catch(e){ console.log(e) }
            tripFound=true;
            break;
        }
    }
    //console.log(actualTimes);

    const title = `Current trip is on route ${currentRoute[routes[0].indexOf('route_short_name')]} ${currentRoute[routes[0].indexOf('route_long_name')]} towards ${currentTrip[trips[0].indexOf('trip_headsign')]} from ${arrivalTimes[1]} to ${arrivalTimes[arrivalTimes.length-1]}`;
    const json={
        "agency": agency,
        "title": title,
        "colors": colors,
        "arrivalTimes": arrivalTimes,
        "tripFound": tripFound,
        "actualTimes": actualTimes,
        "tripstops": tripstops,
        "tripStopsStr": arrayStr(tripstops),
        "routecolor": color,
        "vehicleFound": vehicleFound,
        "popup": popup,
        "shape": arrayStr(shape),
        "vehicle": JSON.stringify(vehicle)
    };

    res.render('pages/trip', json);
    //res.send(json);
});

app.get("/:agency/map", async (req, res) => {
    const agency=req.params.agency;
    const mapstr = readFileSync('./maps.json');
    const mapjson = JSON.parse(mapstr);
    const mapJSON = [];
    for(const map of mapjson){
        if(map.agency == agency){
            const m={
                "name": map.name.split('_').join(' '),
                "url": map.url
            }
            mapJSON.push(m);
        }
    }
    const routes = fileArray(agency,'routes');
    const stops = fileArray(agency,'stops');
    // Get all vehicles
    const urls = JSON.parse(readFileSync('./URL.json'));
    const VPurl = urls[agency].vehiclePositions;
    let allVehicles = [{}];
    await fetch(VPurl).then(async (response) => {
        if(agency == 'VIA'){
            allVehicles=await response.json();
        }else if(agency == 'TTC'){
            const gtfs=await response.json();
            allVehicles = gtfs.vehicle;
        }else if(agency == 'GO'){
            const gtfs=await response.json();
            allVehicles = gtfs.entity;
        }else{
            const buffer = await response.buffer();
            const hex = buffer.toString('hex').split('');
            let str = '';
            let c = 0;
            for (const char of hex) {
                c++;
                str += char;
                if (c % 2 == 0) {
                    str += ' ';
                }
            }
            const protobufferarr = str.split(' ');
            const gtfs = decode(protobufferarr, formatGTFS);
            allVehicles = gtfs.entity;
        }
    }).catch(() => {});
    const routeshapes = fileArray(agency,'routeshapes');
    let directions=[];
    if(agency == 'TTC'){
        directions = fileArray(agency,'directions');
    }
    const json={
        "agency": agency,
        "mapJSON": mapJSON,
        "routeshapes": arrayStr(routeshapes),
        "directions": arrayStr(directions),
        "routes": arrayStr(routes),
        "stops": arrayStr(stops),
        "vehicles": JSON.stringify(allVehicles)
    };
    res.render('pages/map',json);
});
app.get("/:agency/localStops", async (req, res) => {
    const agency = req.params.agency;
    const lat = req.query.lat;
    const lng = req.query.lng;
    const latRange = req.query.latRange;
    const lngRange = req.query.lngRange;
    const stops = fileArray(agency,'stops');
    const newstops = [stops[0]];
    for(let i=1;i<stops.length;i++){
        if(Math.abs(stops[i][stops[0].indexOf('stop_lat')]-lat)<=latRange && Math.abs(stops[i][stops[0].indexOf('stop_lon')]-lng) <= lngRange){
            newstops.push(stops[i]);
        }
    }
    res.send({stops: newstops});
});

app.get("/GO/fare/:startStop/:endStop/", async (req, res) => {
    const fares = fileArray('GO','fare_attributes');
    const stops = fileArray('GO','stops');
    const startStop = findRow(stops,'stop_id',req.params.startStop);
    const endStop = findRow(stops,'stop_id',req.params.endStop);
    const fareid = startStop[stops[0].indexOf('zone_id')]+'-'+endStop[stops[0].indexOf('zone_id')];
    const fareRow = findRow(fares,'fare_id',fareid);
    const standardFare = parseFloat(fareRow[fares[0].indexOf('price')]);
    res.render('pages/distancefare',{
        standardFares: [standardFare, Math.round(standardFare*50)/100, standardFare],
        prestoFares: [Math.round(standardFare*84.3)/100, Math.round(standardFare*45)/100, Math.round(standardFare*60)/100]
    });
});
app.get("/:agency/fare", async (req, res) => {
    const agency = req.params.agency;
    if(agency=='GO'){
        const stops = fileArray('GO','stops');
        res.render('pages/farecalculator',{stops: arrayStr(stops)});
    }else if(agency=='YRT'){
        res.render('pages/fixedfare',{
            agency: agency,
            details: [
                'Cash fare: $4.25',
                'PRESTO adult fare: $3.88',
                'PRESTO youth (13-19) fare: $3.03',
                'PRESTO child (6-12) fare: $2.40',
                'PRESTO senior (65+) fare: $2.40',
                'Monthly pass: $154'
            ]
        });
    }
});


// Utility methods

// Find service ids for an agency on a given date
function findService(agency, date=new Date()){
    const localDate=new Date(date-date.getTimezoneOffset()*60000);
    const dateStr = localDate.toISOString().substring(0, 10).split('-').join('');
    if(agency=='GO'||agency=='UPX') return dateStr;
    const cal1=fileArray(agency, 'calendar');
    const cal2=fileArray(agency, 'calendar_dates');
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
    return serviceids;
}
app.get("/:agency/findService/:date/", async (req, res) => {
    const date=new Date(req.params.date);
    date.setUTCHours('6');
    res.send({'service': findService(req.params.agency, date)});
});

// Read a CSV data file and return its contents in the form of a 2D array
function fileArray(agency, filename, flag=false) {
    if(agency=='TTC'&&filename=='stop_times'){
        return fileArrayStopTimes();
    }
    const filestr = readFileSync(`./gtfs/${agency}/${filename}.txt`).toString();
    let array1 = filestr.split('\r\n');
    if(flag) array1 = filestr.split('\n');
    let array2 = [];
    for (const el of array1) {
        if (el.length > 0) array2.push(el.split(','));
    }
    return array2;
}
app.get("/:agency/fileArray/:file/", async (req, res) => {
    res.send({'file': fileArray(req.params.agency, req.params.file)});
});
function fileArrayStopTimes() { // for TTC's stop_times file only
    const serviceids=findService('TTC');
    let stoptimes=[['trip_id','arrival_time','departure_time','stop_id','stop_sequence','stop_headsign','pickup_type','drop_off_type','shape_dist_traveled']];
    for(const id of serviceids){
        const filestr = readFileSync(`./gtfs/TTC/${id}.txt`).toString();
        let array1 = filestr.split('\r\n');
        for (let i=1;i<array1.length;i++) {
            if (array1[i].length > 0) stoptimes.push(array1[i].split(','));
        }
    }
    return stoptimes;
}

// Creates a string version of a 2D array
function arrayStr(array1) {
    let array2 = [];
    for (let i = 0; i < array1.length; i++) {
        array2.push(array1[i].join(','));
    }
    const filestr = array2.join('\n');
    return filestr;
}

// Make a color lighter
function tint(color) {
    if (color == undefined) color = '7f7f7f';
    let rgb = [parseInt(color.substring(0, 2), 16), parseInt(color.substring(2, 4), 16), parseInt(color.substring(4, 6), 16)];
    let newcolor = "";
    for (let i = 0; i < 3; i++) {
        let tint = 255 - rgb[i];
        tint *= 2 / 3;
        rgb[i] += tint;
        let hex = rgb[i].toString(16);
        if (hex.length == 1) {
            newcolor += '0' + hex.substring(0, 2);
        } else {
            newcolor += hex.substring(0, 2);
        }
    }
    return newcolor;
}

// Find a row in a 2D table
function findRow(table=[[]], searchColName='', searchStr=''){
    for(const row of table){
        if(row[table[0].indexOf(searchColName)]==searchStr){
            return row;
        }
    }
    return [];
}

// Start the server
const PORT = 3000;
app.listen(PORT);
console.log('Server active on port: ' + PORT);