document.addEventListener('DOMContentLoaded', init);
const URL = 'localhost:3000'; // base URL of website
let agency='';
let command='';
let mainform;
let display;

function init() {
    // Get global elements
    display=document.getElementById('display');
    mainform=document.getElementById('mainform');
    mainform.addEventListener('submit',redirect);
    // Agency selection
    let agencySelect=document.getElementById('agencySelect');
    agencySelect.addEventListener('change',updateBackground);
    // Continue button
    let continuebtn=document.getElementById('continue');
    continuebtn.addEventListener('click',updateForm);
    // If being used on mobile, display a message to ask the user to turn device to landscape mode
    updateOrientation();
    screen.orientation.addEventListener('change',updateOrientation);
}

function updateOrientation(){
    let welcomeMsg=document.getElementById('welcomeMsg');
    let portraitMsg=document.getElementById('portraitMsg');
    if (screen.orientation.type == 'landscape-primary') {
        welcomeMsg.style.display="";
        portraitMsg.style.display="none";
    } else {
        welcomeMsg.style.display="none";
        portraitMsg.style.display="";
    }
}

function updateBackground(){
    const a=document.getElementById('agencySelect').value;
    const img=document.getElementById('background');
    const bkgds=['TTC','YRT','MiWay','Brampton','DRT','GO','GRT'];
    if(bkgds.includes(a)){
        img.src='/backgrounds/'+a+'.jpg';
    }else{
        img.src='/backgrounds/GTA.jpg';
    }
}

async function updateForm(event){
    event.preventDefault();
    // Create container div for the page-specific inputs
    let update=document.getElementById('update');
    if(update==null){
        update=document.createElement('div');
        update.setAttribute('id','update');
        mainform.appendChild(update);
    }else{
        update.innerHTML='';
    }
    // Get agency and page selection
    let agencySelect=document.getElementById('agencySelect');
    let pageSelect=document.getElementById('pageSelect');
    display.style='text-align: center; font-size: 30px; color: black;';
    if(agencySelect.value=='-'||pageSelect.value=='-'){
        display.innerHTML=`Choose an agency and a page, then click Continue.`;
        return;
    }else if(agencySelect.value=='TTC'&&pageSelect.value=='map'){
        display.style='text-align: center; font-size: 30px; color: #c45f00;';
        display.innerHTML='Sorry, maps for the TTC are currently not available.<br>Please choose a different agency or a different page.';
        return;
    }
    agency=agencySelect.value;
    command=pageSelect.value;
    display.innerHTML=`Agency: ${agency}<br>Page: ${command}`
    let brp=document.createElement('p');
    update.appendChild(brp);
    // Add respective selection items to the main form
    // Findfare: redirect immediately
    if(command=='findfare'){
        console.log(window.location.href);
        window.location.href=`/${agency}/fare`;
        return;
    }
    // Map: redirect immediately
    else if(command=='map'){
        console.log(window.location.href);
        window.location.href=`/${agency}/map`;
        return;
    }
    // Nextbus: stop id (text input, search for stop name/id)
    //   Optional: route id(s) (route list dropdown), number of predictions (number, default=5)
    else if(command=='nextbus'){
        let input=document.createElement('input');
        input.setAttribute('type','text');
        input.setAttribute('id','stopsearch');
        input.setAttribute('style','width: 250px');
        input.setAttribute('placeholder','Please enter stop name / id');
        input.addEventListener('keydown',checkEnter);
        update.appendChild(input);
        let search=document.createElement('button');
        search.innerHTML='Search for stop';
        search.addEventListener('click',stopSearch);
        update.appendChild(search);
        let br=document.createElement('br');
        update.appendChild(br);
        let br2=document.createElement('br');
        update.appendChild(br2);
        let choices=document.createElement('select');
        choices.setAttribute('id','stopid');
        choices.style.display='none';
        let option=document.createElement('option');
        option.setAttribute('value','-');
        option.innerHTML='Choose a stop';
        choices.appendChild(option);
        update.appendChild(choices);
        /*let optionalp=document.createElement('p');
        optionalp.innerHTML='Additional options';
        let numLabel=document.createElement('label');
        numLabel.setAttribute('for','predictions');
        numLabel.innerHTML='Number of results: ';
        let num=document.createElement('input');
        num.setAttribute('id','predictions');
        num.setAttribute('type','number');
        num.setAttribute('style','width: 30px');
        num.value=5;
        if(agency!='TTC'){
            choices.addEventListener('change',findRoutes);
            update.appendChild(optionalp);
            update.appendChild(numLabel);
            update.appendChild(num);
        }*/
    }
    // Routelist: redirect immediately
    else if(command=='routelist'){
        window.location.href=`/${agency}/routelist`;
        return;
    }
    // Routeschedule: route id (route list dropdown)
    //   Optional: date (date, default=current date), direction id (number dropdown, default=0)
    else if(command=='routeschedule'){
        const routes=await fileArray('routes');
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
            if(agency=='TTC'&&routes[i][routes[0].indexOf('route_type')]==1){
                continue;
            }else{
                input.appendChild(option);
            }
        }
        input.addEventListener('change',findDirections);
        update.appendChild(input);
        let optionalp=document.createElement('p');
        optionalp.innerHTML='Additional options';
        update.appendChild(optionalp);
        let date=document.createElement('input');
        date.setAttribute('id','date');
        date.setAttribute('type','date');
        let curDate=new Date();
        let month=curDate.getMonth()+1;
        if(month<10){
            month='0'+month;
        }let day=curDate.getDate();
        if(day<10){
            day='0'+day;
        }let datestr=curDate.getFullYear()+'-'+month+'-'+day;
        date.defaultValue=datestr;
        let label=document.createElement('label');
        label.setAttribute('for','date');
        label.innerHTML='Choose a date: ';
        update.appendChild(label);
        update.appendChild(date);
    }
    // Routevehicles: route id (route list dropdown)
    else if(command=='routevehicles'){
        const routes=await fileArray('routes');
        let input=document.createElement('select');
        input.setAttribute('id','routeid');
        for(let i=1;i<routes.length;i++){
            let option=document.createElement('option');
            option.setAttribute('value',routes[i][routes[0].indexOf('route_short_name')]);
            option.innerHTML=routes[i][routes[0].indexOf('route_short_name')]+' '+routes[i][routes[0].indexOf('route_long_name')];
            if(agency=='TTC'&&routes[i][routes[0].indexOf('route_type')]==1){
                continue;
            }else{
                input.appendChild(option);
            }
        }
        update.appendChild(input);
    }
    // Stopschedule: stop id (text input, search for stop name/id)
    //   Optional: date (date, default=current date)
    else if(command=='stopschedule'){
        let input=document.createElement('input');
        input.setAttribute('type','text');
        input.setAttribute('id','stopsearch');
        input.setAttribute('style','width: 250px');
        input.setAttribute('placeholder','Please enter stop name / id');
        input.addEventListener('keydown',checkEnter);
        update.appendChild(input);
        let search=document.createElement('button');
        search.innerHTML='Search for stop';
        search.addEventListener('click',stopSearch);
        update.appendChild(search);
        let br=document.createElement('br');
        update.appendChild(br);
        let br2=document.createElement('br');
        update.appendChild(br2);
        let choices=document.createElement('select');
        choices.setAttribute('id','stopid');
        choices.style.display='none';
        let option=document.createElement('option');
        option.setAttribute('value','-');
        option.innerHTML='Choose a stop';
        choices.appendChild(option);
        update.appendChild(choices);
        let optionalp=document.createElement('p');
        optionalp.innerHTML='Additional options';
        update.appendChild(optionalp);
        // Choose date
        let date=document.createElement('input');
        date.setAttribute('id','date');
        date.setAttribute('type','date');
        let curDate=new Date();
        let month=curDate.getMonth()+1;
        if(month<10){
            month='0'+month;
        }let day=curDate.getDate();
        if(day<10){
            day='0'+day;
        }let datestr=curDate.getFullYear()+'-'+month+'-'+day;
        date.defaultValue=datestr;
        let label=document.createElement('label');
        label.setAttribute('for','date');
        label.innerHTML='Choose a date: ';
        update.appendChild(label);
        update.appendChild(date);
    }
    // Confirmation button for main form (if not already present)
    if(document.getElementById('submit')==null){
        let br=document.createElement('br');
        mainform.appendChild(br);
        let confirm=document.createElement('input');
        confirm.style='font-size: 20px;';
        confirm.setAttribute('type','submit');
        confirm.setAttribute('id','submit');
        confirm.setAttribute('value','Proceed to result');
        mainform.appendChild(confirm);
    }
}

async function checkEnter(event){
    if(event.key=='Enter'){
        stopSearch(event);
    }
}

async function checkEnter2(event){
    if(event.key=='Enter'){
        stopSearch2(event);
    }
}

async function findDirections(event){
    event.preventDefault();
    let dateinput=document.getElementById('date');
    let update=document.getElementById('update');
    // Loop through all trips to find possible headsign directions
    let input=document.getElementById('directionid');
    if(input==null){
        input=document.createElement('select');
        input.setAttribute('id','directionid');
        let label=document.createElement('label');
        label.innerHTML='<br>Choose a direction: ';
        label.setAttribute('for','directionid');
        update.appendChild(label);
        update.appendChild(input);
    }else{
        input.innerHTML='';
    }
    let headsigns=[];
    let date=new Date(dateinput.value);
    const dateStr = date.toISOString().substring(0, 10);
    const service = await fetch(`/${agency}/findService/${dateStr}`).then((response) => {return response.json()}).then((json) => {return json.service});
    const trips=await fileArray('trips');
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
}

function findRow(table=[[]], searchColName='', searchStr=''){
    for(const row of table){
        if(row[table[0].indexOf(searchColName)]==searchStr){
            return row;
        }
    }
    return [];
}

async function findRoutes(event){
    event.preventDefault();
    // Loop through all stoptimes to find all tripids for that stop
    // Use tripids to find all routeids
    let update=document.getElementById('update');
    const times=await fileArray('stop_times');
    const trips=await fileArray('trips');
    const routes=await fileArray('routes');
    const date=new Date();
    const service=await findService(date);
    // Get stopid
    const stopid=document.getElementById('stopid').value;
    if(stopid=='-'){
        return;
    }
    // Get all trips at this stop
    let stoptrips=[];
    for(let i=1;i<times.length;i++){
        if(times[i][times[0].indexOf('stop_id')]==stopid){
            stoptrips.push(times[i][times[0].indexOf('trip_id')]);
        }
    }
    // Get all routes that run through this stop
    let routeids=[];
    for(let i=1;i<trips.length;i++){
        if(stoptrips.includes(trips[i][trips[0].indexOf('trip_id')])&&service.includes(trips[i][trips[0].indexOf('service_id')])&&!routeids.includes(trips[i][trips[0].indexOf('route_id')])){
            routeids.push(trips[i][trips[0].indexOf('route_id')]);
        }
    }
    // Add a container and checkboxes for each route
    if(routeids.length==0){
        let errormsg=document.createElement('p');
        errormsg.innerHTML='There is no service at this stop today.<br>Please choose another stop.';
        update.appendChild(p);
    }
    let container=document.getElementById('routeids');
    if(container==null){
        let br1=document.createElement('br');
        update.appendChild(br1);
        let labelp=document.createElement('label');
        labelp.setAttribute('for','routeids');
        labelp.innerHTML='Choose routes to filter (or none to show all routes):';
        update.appendChild(labelp);
        let br2=document.createElement('br');
        update.appendChild(br2);
        container=document.createElement('div');
        container.setAttribute('id','routeids');
        update.appendChild(container);
    }else{
        container.innerHTML='';
    }
    for(let i=1;i<routes.length;i++){
        if(routeids.includes(routes[i][routes[0].indexOf('route_id')])){
            let option=document.createElement('input');
            option.setAttribute('type','checkbox');
            option.setAttribute('value',routes[i][routes[0].indexOf('route_id')]);
            option.setAttribute('class','routeid');
            option.setAttribute('id',routes[i][routes[0].indexOf('route_id')]);
            container.appendChild(option);
            let label=document.createElement('label');
            label.setAttribute('for',routes[i][routes[0].indexOf('route_id')]);
            label.innerHTML=routes[i][routes[0].indexOf('route_short_name')]+' '+routes[i][routes[0].indexOf('route_long_name')];
            container.appendChild(label);
            let br=document.createElement('br');
            container.appendChild(br);
        }
    }
}

async function stopSearch(event){
    event.preventDefault();
    const stops=await fileArray('stops');
    let stopsearch=document.getElementById('stopsearch');
    const search=stopsearch.value;
    if(search.length==0){
        return;
    }
    //console.log(search);
    let choices=document.getElementById('stopid');
    choices.style.display='';
    choices.innerHTML='';
    /*let defaultoption=document.createElement('option');
    defaultoption.setAttribute('value','-');
    defaultoption.innerHTML='Choose a stop';
    choices.appendChild(defaultoption);*/
    // Search for the stop by stop name or stop id
    for(let i=1;i<stops.length;i++){
        const stop=stops[i];
        const stopname=stop[stops[0].indexOf('stop_name')].toLowerCase();
        if(stopname.includes(search.toLowerCase())||stop[stops[0].indexOf('stop_id')]==search||stop[stops[0].indexOf('stop_code')]==search){
            if(agency=='TTC'){
                let option=document.createElement('option');
                option.setAttribute('value',stop[stops[0].indexOf('stop_code')]);
                option.innerHTML='#'+stop[stops[0].indexOf('stop_code')]+' '+stop[stops[0].indexOf('stop_name')];
                choices.appendChild(option);
            }else{
                let option=document.createElement('option');
                option.setAttribute('value',stop[stops[0].indexOf('stop_id')]);
                option.innerHTML='#'+stop[stops[0].indexOf('stop_id')]+' '+stop[stops[0].indexOf('stop_name')];
                choices.appendChild(option);
            }
        }
    }
    if(choices.length==0){
        let option=document.createElement('option');
        option.setAttribute('value','-');
        option.innerHTML='Invalid stop name / id';
        choices.appendChild(option);
    }
}
async function stopSearch2(event){
    event.preventDefault();
    const stops=await fileArray('stops');
    let stopsearch=document.getElementById('stopsearch2');
    const search=stopsearch.value;
    if(search.length==0){
        return;
    }
    let choices=document.getElementById('stopid2');
    choices.style.display='';
    choices.innerHTML='';
    /*let defaultoption=document.createElement('option');
    defaultoption.setAttribute('value','-');
    defaultoption.innerHTML='Choose a second stop';
    choices.appendChild(defaultoption);*/
    // Search for the stop by stop name or stop id
    for(let i=1;i<stops.length;i++){
        const stop=stops[i];
        const stopname=stop[stops[0].indexOf('stop_name')].toLowerCase();
        if(stopname.includes(search.toLowerCase())||stop[stops[0].indexOf('stop_id')]==search){
            let option=document.createElement('option');
            option.setAttribute('value',stop[stops[0].indexOf('stop_id')]);
            option.innerHTML='#'+stop[stops[0].indexOf('stop_id')]+' '+stop[stops[0].indexOf('stop_name')];
            choices.appendChild(option);
        }
    }
}

async function redirect(event){
    event.preventDefault();
    // Get inputs for each different page and redirect them accordingly
    /* Map: agency only
    else if(command=='map'){
        window.location.href=`https://transitGTA.kevinwang21.repl.co/map/?a=${agency}`;
    }*/
    // Nextbus: stop id (text input, search for stop name/id)
    //   Optional: route id(s) (route list dropdown), number of predictions (number, default=5)
    if(command=='nextbus'){
        const stopid=document.getElementById('stopid').value;
        /*let predictions=5;
        let routeids=[];
        if(agency!='TTC'){ // route filters and prediction number do not work with TTC
            predictions=document.getElementById('predictions').value;
            const routescontainer=document.getElementById('routeids');
            let routeboxes=[];
            if(routescontainer!=null){
                routeboxes=routescontainer.getElementsByClassName('routeid');
            }
            for(const box of routeboxes){
                if(box.checked){
                    routeids.push(box.id);
                }
            }
        }
        let str=routeids.join(',');
        if(stopid!='-'){
            if(str.length==0){
                window.location.href=`https://transitGTA.kevinwang21.repl.co/nextbus/?a=${agency}&s=${stopid}&n=${predictions}`;
            }else{
                window.location.href=`https://transitGTA.kevinwang21.repl.co/nextbus/?a=${agency}&s=${stopid}&r=${str}&n=${predictions}`;
            }
        }*/
        if(stopid!='-'){
            window.location.href=`/${agency}/nextbus?s=${stopid}`;
        }else{
            display.innerHTML='Please enter a stop name in the text box and click Search, then select one from the dropdown menu.';
        }
    }
    // Routeschedule: route id (route list dropdown)
    //   Optional: date (date, default=current date), direction id (number dropdown, default=0)
    else if(command=='routeschedule'){
        const routeid=document.getElementById('routeid').value;
        const datestr=document.getElementById('date').value;
        const direction=document.getElementById('directionid');
        let directionid='-';
        if(direction!=null){
            if(direction.value!=''){
                directionid=direction.value;
            }
        }
        if(routeid!='-'&&directionid!='-'){
            window.location.href=`/${agency}/routeschedule?r=${routeid}&d=${directionid}&t=${datestr}`;
        }else{
            display.innerHTML='Please choose a route from the route list dropdown menu, then choose a direction from the direction list dropdown menu.';
        }
    }
    // Routevehicles: route id (route list dropdown)
    else if(command=='routevehicles'){
        let input=document.getElementById('routeid');
        let routeid=input.value;
        window.location.href=`/${agency}/routevehicles?r=${routeid}`;
    }
    // Stopschedule: stop id (text input, search for stop name/id)
    //   Optional: date (date, default=current date)
    else if(command=='stopschedule'){
        let input=document.getElementById('stopid');
        const datestr=document.getElementById('date').value;
        let stopid=input.value;
        if(stopid!='-'){
            window.location.href=`/${agency}/stopschedule?s=${stopid}&t=${datestr}`;
        }else{
            display.innerHTML='Please enter a stop name in the text box and click Search, then select one from the dropdown menu.';
        }
    }
    /* Trip: trip id (text input)
    else if(command=='trip'){
        let input=document.getElementById('tripid');
        let tripid=input.value;
        if(tripid.length>0){
            window.location.href=`/${agency}/trip/?t=${tripid}`;
        }
    }*/
}

async function findService(date){
    const localDate=new Date(date.getTime()+date.getTimezoneOffset()*60000);
    const dateStr = localDate.toISOString().substring(0, 10).split('-').join('');
    if(agency=='GO'||agency=='UPX') return dateStr;
    const cal1=await fileArray('calendar');
    const cal2=await fileArray('calendar_dates');
    let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    let serviceids = [];
    for (let i = 1; i < cal1.length; i++) {
        if (cal1[i][cal1[0].indexOf(`${days[localDate.getDay()]}`)] == 1 && !serviceids.includes(cal1[i][cal1[0].indexOf('service_id')])) {
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
    const file = await fetch(`/${agency}/fileArray/${fileName}`).then((response) => {return response.json()}).then((json) => {return json.file});
    return file;
    /*return new Promise(async (resolve) => {
        const response=await request('https://gtfsGTA.kevinwang21.repl.co/gtfs/'+agency+'/'+fileName+'.txt');
        const array1=response.split("\r\n");
        let array2=[];
        for(const arr of array1){
            if(arr.length>0){
                array2.push(arr.split(','));
            }
        }
        resolve(array2);
    });*/
}