fetch('/proof.json').then(r=>r.json()).then(data=>{
  const target=document.getElementById('run'); target.replaceChildren();
  for(const event of data.events){
    const row=document.createElement('div'); row.className='meal-row';
    const heading=document.createElement('strong'); heading.textContent=event.tool;
    const text=document.createElement('p');
    if(event.tool==='pantry_snapshot') text.textContent=`Persistent state version ${event.result.version}; ${event.result.lots.length} inventory lots.`;
    else if(event.tool==='recommend_dinner') text.textContent=`${event.result.options.length} options generated from real available quantities.`;
    else if(event.tool==='confirm_dinner') text.textContent=`User-confirmed demonstration: ${event.result.plan.detail.recipe.name}; state ${event.result.plan.state}.`;
    else if(event.tool==='mark_meal_cooked') text.textContent='Reserved quantities consumed once; meal history persisted.';
    row.append(heading,text); target.append(row);
  }
}).catch(()=>{document.getElementById('run').textContent='No saved client evidence is bundled yet. Run the demonstration client and add its fictional-data report.';});
