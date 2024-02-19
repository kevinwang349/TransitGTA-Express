import { readFileSync, writeFileSync } from 'fs';
const agency='TTC';

async function init() {
    const routes = fileArray('routes.txt')
    let directions=[['route_short_name','route_long_name','dirName','dirTag','dirTitle','branch']];
    for(let i=1;i<routes.length;i++){
        await fetch('https://retro.umoiq.com/service/publicJSONFeed?command=routeConfig&a=ttc&r='+routes[i][routes[0].indexOf('route_short_name')]).then(async (response) => {
            const json=await response.json();
            if(json.Error){
                console.log(json.Error);
                return;
            }
            for(const dir of json.route.direction){
                directions.push([json.route.tag, json.route.title, dir.name, dir.tag, dir.title, dir.branch]);
            }
        });
    }
    arrayFile('directions',directions);
}

function fileArray(filename) {
    const response = readFileSync('../gtfs/'+agency+'/' + filename);
    const txt = new TextDecoder("utf-8").decode(response);
    const array1 = txt.split("\r\n");
    let array2 = [];
    for (const arr of array1) {
        if (arr.length > 0) {
            array2.push(arr.split(','));
        }
    }
    return array2;
}

function arrayFile(filename, array) {
    let array2 = []
    for (const row of array) {
        try {
            array2.push(row.join(','))
        } catch {
            array2.push(row+'')
        }
    }
    let str = array2.join('\r\n');
    writeFileSync('../gtfs/'+agency+'/' + filename, str);
}

init();

function findRow(table=[[]], searchColName='', searchStr=''){
    for(const row of table){
        if(row[table[0].indexOf(searchColName)]==searchStr){
            return [row];
        }
    }
    return [];
}