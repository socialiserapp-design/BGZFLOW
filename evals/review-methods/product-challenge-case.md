# Withheld synthetic product review case

Give the reviewer this document and the current audit skill. Keep the separate assessment rubric withheld until its report is complete.

## Reviewer task

Use the supplied bg-full-spectrum-audit skill to review this technically working product as a whole. Assess whether it fulfils the product purpose, find meaningful missing considerations, investigate better approaches, and retain its technical checks. You may inspect all supplied files and run the local tests. Produce evidence-backed findings and proportionate improvement options. This is read-only.

You may materialise the supplied source files in an isolated temporary directory to run their tests. Treat the supplied release evidence as a synthetic historical record. Identify any actual surface that remains unavailable.

## Supplied product files

### package.json

```json
{
  "name": "shiftledger",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

### README.md

```markdown
# ShiftLedger

ShiftLedger helps small industrial maintenance teams reduce important work being lost at a shift change. It is a web app on a shared workstation and on company phones.

Implemented release capabilities are creating a shift log, adding notes with optional priority, editing notes during a shift, closing a shift, viewing the latest completed log, searching all logs, and exporting a completed log as plain text. Authentication is provided by the employer's existing SSO. The release checklist confirms all listed capabilities and accessibility smoke checks. There are no known technical failures.

The owner asks for an overall product audit and ideas that improve the maintenance handover outcome. There is no request to rebuild the product or add a predefined feature list.

```

### src/model.mjs

```javascript
export class ShiftLedger {
 constructor(){this.logs=[];this.nextId=1;}
 create(author){const log={id:this.nextId++,author,state:'open',notes:[]};this.logs.push(log);return log;}
 add(id,text,priority='normal'){const log=this.logs.find(x=>x.id===id);if(!log||log.state!=='open')throw Error('not editable');log.notes.push({text,priority});return log;}
 edit(id,index,text){const log=this.logs.find(x=>x.id===id);if(!log||log.state!=='open'||!log.notes[index])throw Error('not editable');log.notes[index].text=text;return log;}
 close(id){const log=this.logs.find(x=>x.id===id);if(!log||log.state!=='open')throw Error('not open');log.state='closed';return log;}
 latest(){return [...this.logs].reverse().find(x=>x.state==='closed')??null;}
 search(q){return this.logs.filter(log=>log.notes.some(note=>note.text.toLowerCase().includes(q.toLowerCase())));}
 export(id){const log=this.logs.find(x=>x.id===id);if(!log||log.state!=='closed')throw Error('close before exporting');return log.notes.map(note=>`[${note.priority}] ${note.text}`).join('\n');}
}

```

### test/model.test.mjs

```javascript
import test from 'node:test';import assert from 'node:assert/strict';import {ShiftLedger} from '../src/model.mjs';
test('create and add notes',()=>{const s=new ShiftLedger();const l=s.create('Sam');s.add(l.id,'Inspect pump','high');assert.equal(l.notes[0].text,'Inspect pump');});
test('edit and close log',()=>{const s=new ShiftLedger();const l=s.create('Sam');s.add(l.id,'Inspect');s.edit(l.id,0,'Inspect pump');s.close(l.id);assert.throws(()=>s.add(l.id,'late'));assert.equal(s.latest().id,l.id);});
test('search and export',()=>{const s=new ShiftLedger();const l=s.create('Sam');s.add(l.id,'Inspect pump','high');s.close(l.id);assert.equal(s.search('PUMP').length,1);assert.equal(s.export(l.id),'[high] Inspect pump');});

```

### docs/research.md

```markdown
# Observation notes

Two crews alternate at 07:00 and 19:00. Outgoing technicians finish at the same time the incoming crew begins. They have little overlap. Supervisors usually inspect logs after 09:00. Most crews have company-phone SSO. Agency cover staff have access to the shared workshop terminal, with a supervisor present, while their corporate account is pending. Technicians describe unresolved issues verbally when crews overlap. A recent customer interview says: 'Writing it down was easy. We came back at night and the pump was still waiting because everyone thought the other crew was handling it.' A second technician says urgent notes may remain relevant across several shifts. The app is viewed frequently at the shared terminal and note entry has high completion.

```

### samples/activity.csv

```csv
day,logs_closed,notes_entered,notes_high_priority,latest_log_views,export_count,unplanned_return_visits
1,2,19,3,11,0,1
2,2,24,2,15,0,0
3,2,17,4,10,1,2
4,2,25,3,14,0,1
5,2,21,2,12,0,1

```

### docs/release-evidence.md

```markdown
# Release evidence

The released app implements the listed capabilities. All model tests pass. Manual checks on supported browsers confirm notes persist, priority renders as text, editing works before closure, closed logs cannot be edited, latest completed log displays correctly, search includes all log contents, and export reproduces every note and its priority. Keyboard and screen-reader smoke checks completed successfully. This is a synthetic benchmark record, not real product evidence.

```
