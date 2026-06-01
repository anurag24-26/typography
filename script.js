const scenes=[
'Most people don\'t fail at Java because it\'s difficult.',
'They fail because they spend months watching tutorials...',
'...and almost no time writing code.',
'I made the same mistake.',
'If you learn a concept today, build something with it today.',
'Even a small program is worth more than another tutorial.',
'Comment JAVA for more tips.'
];

let i=0;
const el=document.getElementById('text');

function show(){
  el.className='';
  void el.offsetWidth;
  el.textContent=scenes[i];
  el.className='zoomIn';
  i=(i+1)%scenes.length;
}
show();
setInterval(show,2500);
