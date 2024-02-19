import { readFileSync, writeFileSync } from "fs";

const calendar = fileArray('calendar');
const trips = fileArray('trips');
const stops = fileArray('stop_times');
console.log(stops.length);

const serviceids = [''];
const servicestops = [[]];
for(let i=1;i<calendar.length;i++){
    serviceids.push(calendar[i][calendar[0].indexOf('service_id')]);
    servicestops.push([stops[0]]);
}
trips.sort((a,b)=>{return parseInt(a[trips[0].indexOf('trip_id')]) - parseInt(b[trips[0].indexOf('trip_id')])})

let i = 1;
console.log(trips.length);
while (i < stops.length) {
    const tripid=parseInt(stops[i][stops[0].indexOf('trip_id')]);
    let l=1;
    let r=trips.length;
    while(r>l){
        let mid=Math.floor((l+r)/2);
        let id=parseInt(trips[mid][trips[0].indexOf('trip_id')]);
        if(tripid==id){
            const index=serviceids.indexOf(trips[mid][trips[0].indexOf('service_id')]);
            servicestops[index].push(stops[i]);
            break;
        }else if(tripid>id){
            l=mid+1;
        }else{
            r=mid;
        }
    }
    /*for(let j=1;j<trips.length;j++){
        if(trips[j][trips[0].indexOf('trip_id')]==stops[i][stops[0].indexOf('trip_id')]){
            const index=serviceids.indexOf(trips[j][trips[0].indexOf('service_id')]);
            servicestops[index].push(stops[i]);
            break;
        }
    }*/
    i++;
    if(i%100000==0) console.log(i);
}
for(let i=1;i<calendar.length;i++){
    arrayFile(servicestops[i],serviceids[i]);
}


// Read a CSV data file and return its contents in the form of a 2D array
function fileArray(filename) {
    const filestr = readFileSync(`../gtfs/TTC/${filename}.txt`).toString();
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
        try{
            array2.push(array1[i].join(','));
        }catch(e){
            array2.push(array1[i]+"");
        }
    }
    const filestr = array2.join('\r\n');
    writeFileSync(`../gtfs/TTC/${filename}.txt`, filestr);
}