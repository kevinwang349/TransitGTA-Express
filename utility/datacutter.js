import { readFileSync, writeFileSync } from "fs";

const calendar = fileArray('calendar_dates');
const serviceids = [];
for(let i=1;i<calendar.length;i++){
    serviceids.push(calendar[i][calendar[0].indexOf('date')]);
}

const trips = fileArray('trips');
const tripids = [];
let trips2 = [trips[0]];
for (let i = 1; i < trips.length; i++) {
    if (serviceids.includes(trips[i][trips[0].indexOf('service_id')])) {
        trips2.push(trips[i]);
        tripids.push(trips[i][trips[0].indexOf('trip_id')]);
    }
}
arrayFile(trips2, 'trips');

const stops = fileArray('stop_times');
let stops2 = [stops[0]];
let i = 1;
console.log(stops.length);
while (i < stops.length) {
    const date=stops[i][stops[0].indexOf('trip_id')].substring(0,8);
    if (serviceids.includes(date)) {
        stops2.push(stops[i]);
    }
    i++;
}
console.log(stops2.length);
arrayFile(stops2, 'stop_times');


// Read a CSV data file and return its contents in the form of a 2D array
function fileArray(filename) {
    const filestr = readFileSync(`../gtfs/GO/${filename}.txt`).toString();
    const array1 = filestr.split('\r\n');
    let array2 = [];
    for (const el of array1) {
        array2.push(el.split(','));
    }
    return array2;
}

// Creates a CSV data file with specified file name using a 2D array
function arrayFile(array1, filename) {
    let array2 = [];
    for (let i = 0; i < array1.length; i++) {
        array2.push(array1[i].join(','));
    }
    const filestr = array2.join('\r\n');
    writeFileSync(`../gtfs/GO/${filename}2.txt`, filestr);
}