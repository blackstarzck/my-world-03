import json, math, re, pathlib, xml.etree.ElementTree as ET
from PIL import Image, ImageStat

BASE = pathlib.Path(__file__).resolve().parent.parent
spec = json.loads((BASE/'design-basis.json').read_text(encoding='utf-8'))
roots = {p.name[:3]:ET.parse(p).getroot() for p in BASE.glob('A*.svg')}
ns = '{http://www.w3.org/2000/svg}'
checks=[]
def check(name, ok, detail=''):
    checks.append({'check':name,'passed':bool(ok),'detail':detail})
def near(a,b,tol=2e-6): return abs(a-b)<tol
def tagged(sheet,role): return [e for e in roots[sheet].iter() if e.get('data-role')==role]
def index(sheet,role): return {e.get('data-item'):e for e in tagged(sheet,role)}
def num(e,a): return float(e.get(a,'0'))
def points(e): return [tuple(map(float,q.split(','))) for q in e.get('points').split()]
def model(e): return json.loads(e.get('data-model'))
def inv_plan(e,k):
    theta=math.radians(spec['rooms'][k]['angle']);d=(math.cos(theta),math.sin(theta));p=(d[1],-d[0])
    out=[]
    for x,y in points(e):
        X,Y=(x-152)/4,(169-y)/4
        out.append((X*p[0]+Y*p[1],X*d[0]+Y*d[1]-12))
    return out
def bounds(ps):return min(p[0] for p in ps),min(p[1] for p in ps),max(p[0] for p in ps),max(p[1] for p in ps)
def plan_geometry(sheet,role,items):
    drawn=index(sheet,role)
    check(f'{sheet} {role} 개수·번호',set(drawn)=={o['id'] for o in items})
    for o in items:
        if o['id'] not in drawn:continue
        x,y,X,Y=bounds(inv_plan(drawn[o['id']],o['room']))
        check(f"{sheet} {o['id']} 실제 위치·크기",all(near(a,b) for a,b in zip((x,y,X,Y),(o['t']-o['w']/2,o['v']-o['l']/2,o['t']+o['w']/2,o['v']+o['l']/2))))

check('도면 5장·동일 개정',set(roots)=={'A01','A02','A03','A04','A05'} and all(r.get('data-revision')=='R02' for r in roots.values()))
for sheet in ['A01','A04']:
    rooms=index(sheet,'room')
    for k in ['01','02','03']:
        x,y,X,Y=bounds(inv_plan(rooms['G'+k],k))
        check(f'{sheet} 전시실{k} 12000×24000',all(near(a,b) for a,b in zip((x,y,X,Y),(-6,0,6,24))))
    curves=spec['lobby']['curves']
    for role,radius in [('inner-envelope',curves[0]['r']),('outer-envelope',curves[0]['outer_r'])]:
        path=tagged(sheet,role)[0].get('d')
        radii=re.findall(r'A([\d.eE+-]+),([\d.eE+-]+)',path)
        check(f'{sheet} {role} 3곡선 실제 반경',len(radii)==3 and all(near(float(a)/4,radius) and near(float(b)/4,radius) for a,b in radii))
    cols=index(sheet,'plan-column' if sheet=='A01' else 'roof-column')
    check(f'{sheet} 기둥 3개',set(cols)=={'C01','C02','C03'})
    for c in spec['lobby']['columns']:
        e=cols[c['id']]
        check(f"{sheet} {c['id']} 위치·지름",near((num(e,'cx')-152)/4,c['x']) and near((169-num(e,'cy'))/4,c['y']) and near(num(e,'r')/4,c['d']/2))
plan_geometry('A01','panel',spec['panels'])
plan_geometry('A01','bench',spec['benches'])
plan_geometry('A01','case',spec['cases'])
plan_geometry('A01','overhead-skylight',spec['skylights'])
plan_geometry('A04','roof-skylight',spec['skylights'])
plan_geometry('A04','roof-track',spec['tracks'])
for id in ['G01','G02','G03','W03']:
    role='room' if id.startswith('G') else 'window'
    check(f'평면↔천장 {id} 좌표 일치',index('A01',role)[id].get('points')==index('A04',role)[id].get('points'))
for sheet,role in [('A01','window'),('A04','window')]:
    x,y,X,Y=bounds(inv_plan(tagged(sheet,role)[0],'03'))
    check(f'{sheet} 창 W03 같은 외곽 벽·길이20000',all(near(a,b) for a,b in zip((x,y,X,Y),(6,2,6.3,22))))
check('Concept03 창 벽에 작품 없음',all(a['t']<0 or a['face']=='end' for a in spec['artworks'] if a['room']=='03'))
arts=tagged('A01','artwork')
check('벽걸이 작품 위치·개수',len(arts)==28 and all(model(e)['room']!='03' or model(e)['t']<=0 for e in arts))
for sheet,role in [('A01','overhead-lobby-skylight'),('A04','roof-lobby-skylight')]:
    e=tagged(sheet,role)[0]
    check(f'{sheet} 로비 천창 중앙 Ø8000',near(num(e,'cx'),152) and near(num(e,'cy'),169) and near(num(e,'r'),16))
for b in spec['lobby']['benches']:
    e=index('A01','arc-bench')[b['id']]
    radii=re.findall(r'A([\d.eE+-]+),([\d.eE+-]+)',e.get('d'))
    check(f"{b['id']} 곡선 벤치 실제 내·외반경",len(radii)==2 and near(float(radii[0][0])/4,5.3) and near(float(radii[1][0])/4,4.7))
check('로비 곡선 벤치 3개',len(tagged('A01','arc-bench'))==3)
R=spec['lobby']['curves'][0]['r']
check('곡선 벽 접선·두께300',near(R,12*math.sqrt(3)-6) and all(near(c['r']-c['outer_r'],.3) for c in spec['lobby']['curves']))
check('중심 기준 Ø18000이 로비 벽 안에 위치',24-R>9)
entry=spec['lobby']['entry'];sag=(-24+R)-entry['y']
check('곡선 출입구 문턱 바닥 연결',entry['threshold_inward_depth']>sag and near(entry['y'],-24+math.sqrt(R*R-1.5*1.5)))
for k in ['01','02','03']:
    objects=[o for group in ['panels','benches','cases'] for o in spec[group] if o['room']==k]
    check(f'전시실{k} 가구가 벽 안에 위치',all(abs(o['t'])+o['w']/2<=6 and o['v']-o['l']/2>=0 and o['v']+o['l']/2<=24 for o in objects))
    overlaps=[]
    for i,a in enumerate(objects):
        for b in objects[i+1:]:
            if abs(a['t']-b['t'])<(a['w']+b['w'])/2 and abs(a['v']-b['v'])<(a['l']+b['l'])/2:overlaps.append((a['id'],b['id']))
    check(f'전시실{k} 가구 서로 겹치지 않음',not overlaps,str(overlaps))
for e in tagged('A01','cross-section-line'):
    m=model(e);theta=math.radians(spec['rooms'][m['room']]['angle']);d=(math.cos(theta),math.sin(theta));p=(d[1],-d[0])
    local=[]
    for a,b in [('x1','y1'),('x2','y2')]:
        X,Y=(num(e,a)-152)/4,(169-num(e,b))/4
        local.append((X*p[0]+Y*p[1],X*d[0]+Y*d[1]-12))
    check(m['id']+' 절단선 실제 위치',all(near(v,m['v']) for t,v in local) and near(abs(local[1][0]-local[0][0]),14))
for e in tagged('A01','long-section-line'):
    m=model(e);theta=math.radians(spec['rooms'][m['room']]['angle']);d=(math.cos(theta),math.sin(theta));p=(d[1],-d[0])
    check(m['id']+' 길이 절단선 중앙',all(near(((num(e,a)-152)/4)*p[0]+((169-num(e,b))/4)*p[1],0) for a,b in [('x1','y1'),('x2','y2')]))
for role in ['cross-panel','cross-case']:
    for e in tagged('A02',role):
        m=model(e);origin={'01':15,'02':150,'03':285}[m['room']]
        check(m['id']+' 가로 단면 위치·폭·높이',near(num(e,'x'),origin+(m['t']+6-m['w']/2)*10) and near(num(e,'width'),m['w']*10) and near(num(e,'height'),m['h']*10) and near(num(e,'y')+num(e,'height'),125))
for e in tagged('A02','section-wall'):
    m=model(e);k={'S1':'01','S2':'02','S3':'03'}[m['id'][:2]]
    check(k+' 가로 단면 천장 높이',near(num(e,'height')/10,spec['rooms'][k]['height']))
e=tagged('A02','cross-window')[0]
check('W03 가로 단면 오른쪽·하단900·상단5400',near(num(e,'x'),405) and near(num(e,'y'),71) and near(num(e,'height'),45))
sc=1000/150
for role in ['long-panel','long-case','long-bench']:
    for e in tagged('A03',role):
        m=model(e);base={'01':94,'02':170,'03':246}[m['room']]
        expected=285-(12+m['v']+m['l']/2)*sc
        check(m['id']+' 길이 단면 투영 위치·길이·높이',m['t']>0 and near(num(e,'x'),expected) and near(num(e,'width'),m['l']*sc) and near(num(e,'height'),m['h']*sc) and near(num(e,'y')+num(e,'height'),base))
v=index('A03','long-case')
check('S6 보는 방향과 좌우 순서 일치',all(num(v[f'V{i:02}'],'x')>num(v[f'V{i+1:02}'],'x') for i in range(6,10)), '오른쪽 벽 방향을 보면 전시실 끝이 화면 왼쪽')
e=tagged('A03','long-window')[0]
check('W03 길이 단면 위치·20000×4500',near(num(e,'x'),285-34*sc) and near(num(e,'width'),20*sc) and near(num(e,'height'),4.5*sc) and near(num(e,'y'),246-5.4*sc))
check('길이 단면 로비 천창 반쪽 4000',len(tagged('A03','long-lobby-skylight'))==3 and all(near(num(e,'width'),4*sc) for e in tagged('A03','long-lobby-skylight')))
for role,sheet in [('long-beam','A03'),('roof-beam','A04')]:
    beams=tagged(sheet,role)
    check(f'{sheet} Concept02 보 5개·위치',len(beams)==5 and sorted(model(e)['v'] for e in beams)==[4,8,12,16,20])
    if sheet=='A03':check('보 깊이600·상단5000 실제 단면',all(near(num(e,'height'),.6*sc) and near(num(e,'y'),170-5*sc) for e in beams))
check('Concept02 조명이 보 아래에 위치',all(t['h']<spec['beams']['bottom'] for t in spec['tracks'] if t['room']=='02'))
e=tagged('A02','lobby-plinth')[0]
check('로비 받침대 Ø3600·H450',near(num(e,'width'),3.6*sc) and near(num(e,'height'),.45*sc))
e=tagged('A02','arc-bench-section')[0]
check('로비 단면 BL1 깊이600·H450',near(num(e,'width'),.6*sc) and near(num(e,'height'),.45*sc))
e=tagged('A02','lobby-skylight')[0]
check('로비 단면 천창 Ø8000',near(num(e,'width'),8*sc))
e=tagged('A05','case-detail')[0]
check('진열장 상세 실제 축척1:25',near(num(e,'width'),48) and near(num(e,'height'),96))
rects=[e for e in roots['A05'].iter(ns+'rect')]
check('일반 벤치 상세 실제 축척1:20',any(near(num(e,'x'),150) and near(num(e,'y'),112) and near(num(e,'width'),100) and near(num(e,'height'),30) for e in rects))
check('전시 벽 상세 실제 축척1:50',any(near(num(e,'x'),20) and near(num(e,'width'),60) and near(num(e,'height'),72) for e in rects))
arc=tagged('A05','arc-bench-detail')[0].get('d')
check('곡선 벤치 상세 정확한 원호·축척1:100','A53,53' in arc and 'A47,47' in arc)
for sheet,r in roots.items():
    check(sheet+' A3 물리 크기',r.get('width')=='420mm' and r.get('height')=='297mm')
    p=next(BASE.glob(sheet+'*.png'))
    with Image.open(p) as im:
        check(sheet+' PNG 크기·해상도',im.size==(3360,2376) and abs(im.info.get('dpi',(0,0))[0]-203.2)<.1)
        check(sheet+' PNG 도면 내용 존재',min(ImageStat.Stat(im.convert('RGB')).stddev)>10)
    metadata=json.loads(r.find(ns+'metadata').text)
    for d in metadata['dimensions']:
        text=d['label'];number=re.fullmatch(r'(?:Ø)?(\d+)(?: 중심 기준)?',text)
        if not number:continue
        # Drawing regions have separately declared scales.
        ax,ay=d['a'];bx,by=d['b']
        if sheet in ['A01','A04']:den=250
        elif sheet=='A02':den=100 if max(ay,by)<165 else 150
        elif sheet=='A03':den=150
        else:den=100 if max(ay,by)>175 else 50 if max(ax,bx)<140 else 20 if max(ax,bx)<275 else 25
        real=math.dist(d['a'],d['b'])*den
        check(f'{sheet} 치수 {text} 실제 축척 검산',abs(real-float(number.group(1)))<.01,f'{real:.2f} mm')
result={'scope':'가상 전시 공간 평면·단면·천장·요소 상세의 기하 및 치수 연계 검수','total':len(checks),'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'checks':checks}
(BASE/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'total':result['total'],'passed':result['passed'],'failed':[c for c in checks if not c['passed']]},ensure_ascii=True))
raise SystemExit(1 if result['failed'] else 0)
