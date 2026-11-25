import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const dir=join(process.cwd(),'data'),file=join(dir,'demo.json');
const sites=[
 {id:'lakeview',name:'Lakeview Artificial Pond',area:'Kothrud, Pune',distance:'2.4 km',status:'Available',waiting:12,wait:'~8 min',capacity:68,icon:'◉',description:'A dedicated immersion site with a calm, spacious viewing area.',facilities:['Accessible ramp','First aid','Drinking water','Changing area'],address:'Demo location · Kothrud',hours:'8:00 AM – 10:00 PM'},
 {id:'central',name:'Central Community Immersion Centre',area:'Shivajinagar, Pune',distance:'4.1 km',status:'Busy',waiting:46,wait:'~24 min',capacity:86,icon:'▤',description:'A community-managed centre with separate arrival and exit lanes.',facilities:['First aid','Drinking water','Parking','Volunteers'],address:'Demo location · Shivajinagar',hours:'7:00 AM – 11:00 PM'},
 {id:'east',name:'East Zone Immersion Facility',area:'Viman Nagar, Pune',distance:'6.8 km',status:'Near capacity',waiting:31,wait:'~18 min',capacity:92,icon:'⌂',description:'A high-capacity facility with family and senior-citizen support.',facilities:['Accessible ramp','First aid','Parking','Family area'],address:'Demo location · Viman Nagar',hours:'8:00 AM – 10:00 PM'},
 {id:'green',name:'Green Park Immersion Pond',area:'Aundh, Pune',distance:'5.2 km',status:'Available',waiting:7,wait:'~5 min',capacity:50,icon:'♧',description:'A smaller green-space location with clearly marked waste sorting.',facilities:['Drinking water','Waste sorting','Volunteers'],address:'Demo location · Aundh',hours:'9:00 AM – 9:00 PM'}
];
const slots=['4:30 – 5:00 PM','5:00 – 5:30 PM','5:30 – 6:00 PM','6:00 – 6:30 PM','6:30 – 7:00 PM'];
export async function seed(reset=false){await mkdir(dir,{recursive:true});if(!reset){try{await readFile(file);return;}catch{}}await writeFile(file,JSON.stringify({sites,slots:sites.flatMap(s=>slots.map((time,i)=>({siteId:s.id,time,capacity:12,booked:(s.id==='central'&&i<2)?7:Math.min(i,3)}))),bookings:[],feedback:[]},null,2));}
export async function read(){const db=JSON.parse(await readFile(file,'utf8'));if(!Array.isArray(db.apifyImports))db.apifyImports=[];return db;}
export async function write(db){await writeFile(file,JSON.stringify(db,null,2));}
