import math, json, html, pathlib, xml.etree.ElementTree as ET
BASE=pathlib.Path(__file__).resolve().parent.parent
BASE.mkdir(parents=True,exist_ok=True)
R=12*math.sqrt(3)-6
ROOMS={
 "01":{"angle":90,"height":6,"color":"#eadcc4","wall":"#183c48","name":"클래식 회화","track":5.2},
 "02":{"angle":210,"height":5,"color":"#e4e6e4","wall":"#939b9b","name":"콘크리트 회화","track":4.2},
 "03":{"angle":330,"height":6,"color":"#e8e2d4","wall":"#9a9b94","name":"조각과 유물","track":5.4}}
def vec(deg): a=math.radians(deg); return math.cos(a),math.sin(a)
def loc(k,t,v):
 dx,dy=vec(ROOMS[k]["angle"]); return dx*(12+v)+dy*t,dy*(12+v)-dx*t
def localpoly(k,t,v,w,l):
 return [loc(k,t-w/2,v-l/2),loc(k,t+w/2,v-l/2),loc(k,t+w/2,v+l/2),loc(k,t-w/2,v+l/2)]
PANELS=[]; BENCHES=[]; CASES=[]; SKIES=[]; TRACKS=[]; ARTS=[]
for k in ["01","02"]:
 for row,v in enumerate([8,16]):
  for side,t in enumerate([-3,3]):
   PANELS.append(dict(id=f"P{k}-{row*2+side+1:02}",room=k,t=t,v=v,w=.3 if k=="01" else 3,l=3 if k=="01" else .3,h=3.6))
 for side,t in enumerate([-4.5,4.5]): BENCHES.append(dict(id=f"B{k}-{side+1:02}",room=k,t=t,v=12,w=.6,l=2,h=.45))
for side,t in enumerate([-3,3]):
 for i,v in enumerate([3,7.5,12,16.5,21]): CASES.append(dict(id=f"V{side*5+i+1:02}",room="03",t=t,v=v,w=1.2,l=1.2,h=2.4))
for i,v in enumerate([4,12,20]): SKIES.append(dict(id=f"K01-{i+1}",room="01",t=0,v=v,w=2.4,l=3.6))
for side,t in enumerate([-3,3]): SKIES.append(dict(id=f"K02-{side+1}",room="02",t=t,v=12,w=1.2,l=20))
for k in ROOMS:
 for i,t in enumerate([-3.8,3.8] if k!="03" else [-3,0,3]):
  TRACKS.append(dict(id=f"L{k}-{i+1}",room=k,t=t,v=12,w=.06,l=20,h=ROOMS[k]["track"]))
for k in ROOMS:
 sides=[-6,6] if k!="03" else [-6]
 for side,t in enumerate(sides):
  for i,v in enumerate([4,8,12,16,20]):
   ARTS.append(dict(id=f"A{k}-{side*5+i+1:02}",room=k,t=t,v=v,w=1.5,h=2,center_z=1.5,face="side"))
 ARTS.append(dict(id=f"A{k}-END",room=k,t=0,v=24,w=2,h=2,center_z=1.5,face="end"))
COLS=[dict(id=f"C{i+1:02}",x=7.5*vec(a)[0],y=7.5*vec(a)[1],d=.3,h=6) for i,a in enumerate([30,150,270])]
CURVES=[dict(id=f"F{i+1}",angle=a,cx=24*vec(a)[0],cy=24*vec(a)[1],r=R,outer_r=R-.3) for i,a in enumerate([30,270,150])]
ENTRY_Y=-24+math.sqrt(R*R-1.5*1.5)
SECTIONS=[dict(id=f"S{i+1}",room=k,kind="cross",v=v,look="+v") for i,(k,v) in enumerate([("01",8),("02",8),("03",12)])]
SECTIONS +=[dict(id=f"S{i+4}",room=k,kind="long",t=0,look="+t") for i,k in enumerate(ROOMS)]
SECTIONS +=[dict(id="S7",room="lobby",kind="long",x=0,look="-x")]
SPEC={"revision":"R02","drawing_date":"2026-10-06","source_units":"m","display_units":"mm","rooms":ROOMS,
"gallery":{"width":12,"length":24,"entry_radius":12,"outer_end_radius":36,"wall_thickness":.3,"roof_slab":.3,"floor_slab":.2,"portal_width":4,"portal_height":4.2},
"lobby":{"reference_circle_diameter":18,"height":6,"central_plinth_diameter":3.6,"plinth_height":.45,"ring_outer_diameter":2.4,"ring_inner_diameter":2.1,"ring_depth":.15,"ring_type":"annular disc","ring_plane":"Y-Z","roof_skylight_diameter":8,
"benches":[{"id":f"BL{i+1}","radius":5,"depth":.6,"height":.45,"angle":a,"sweep":40} for i,a in enumerate([90,210,330])],
"columns":COLS,"curves":CURVES,"entry":{"width":3,"height":3,"y":ENTRY_Y,"threshold_outward_depth":.3,"threshold_inward_depth":.1}},
"panels":PANELS,"benches":BENCHES,"cases":CASES,"skylights":SKIES,"tracks":TRACKS,"artworks":ARTS,
"case_detail":{"pedestal_width":.6,"pedestal_depth":.6,"pedestal_height":1,"sculpture_width":.5,"sculpture_height":.7,"frame":.02,"glass":.006},
"window":{"id":"W03","room":"03","side_t":6,"v0":2,"v1":22,"sill":.9,"head":5.4,"mullions":[2,6,10,14,18,22],"mullion_width":.3},
"beams":{"room":"02","v":[4,8,12,16,20],"width":.3,"bottom":4.4,"top":5},
"sections":SECTIONS}
(BASE/"design-basis.json").write_text(json.dumps(SPEC,ensure_ascii=False,indent=2),encoding="utf-8")
def fmt(n): return f"{n*1000:.0f}"
def attr(data):
 return " ".join(f'{k}="{html.escape(str(v),quote=True)}"' for k,v in data.items() if v is not None)
class Sheet:
 def __init__(self,num,title,sub,scale):
  self.num=num;self.title=title;self.sub=sub;self.scale=scale;self.parts=[];self.items=[];self.dims=[]
  self.raw('<rect width="420" height="297" fill="white"/>')
  self.raw('<defs><pattern id="wood" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="4" fill="#eadcc4"/><path d="M0 0L2 2L0 4M2 0L4 2L2 4" fill="none" stroke="#ccbaa0" stroke-width=".13"/></pattern><pattern id="concrete" patternUnits="userSpaceOnUse" width="5" height="5"><rect width="5" height="5" fill="#e4e6e4"/><circle cx="1" cy="2" r=".08" fill="#b0b7b7"/><circle cx="4" cy="4" r=".08" fill="#b0b7b7"/></pattern><pattern id="stone" patternUnits="userSpaceOnUse" width="8" height="5"><rect width="8" height="5" fill="#e8e2d4"/><path d="M0 0H8V5H0Z" fill="none" stroke="#c5c2b7" stroke-width=".13"/></pattern></defs>')
  self.rect(5,5,410,287,fill="none",stroke="#a2a7ab",sw=.2)
  self.text(10,13,title,5.2,weight="bold")
  self.text(10,20,sub,2.8,color="#5b656b")
  self.text(410,13,f"{num}  |  R02",4,anchor="end",weight="bold")
  self.line(10,23,410,23,color="#9aabae",sw=.2)
  self.line(10,281,410,281,color="#9aabae",sw=.2)
  self.text(10,287,"가상 3D 전시 공간 제안 설계 · 실측 아님",2.7)
  self.text(410,287,f"단위 mm  |  {scale}  |  2026-10-06",2.7,anchor="end")
 def raw(self,s):self.parts.append(s)
 def text(self,x,y,s,size=3,anchor="start",color="#172d34",weight="normal",angle=0,halo=False):
  self.raw(f'<text {attr(dict(x=x,y=y,fill=color,**{"font-size":size,"text-anchor":anchor,"font-weight":weight,"stroke":"white" if halo else None,"stroke-width":.8 if halo else None,"paint-order":"stroke" if halo else None},transform=f"rotate({angle} {x} {y})" if angle else None))}>{html.escape(str(s))}</text>')
 def line(self,x,y,X,Y,color="#344d56",sw=.2,dash=None,meta=None):
  extra={}
  if meta:extra={"data-item":meta["id"],"data-role":meta.get("role",""),"data-model":json.dumps(meta,separators=(",",":"))};self.items.append(meta)
  self.raw(f'<line {attr(dict(x1=x,y1=y,x2=X,y2=Y,stroke=color,**{"stroke-width":sw,"stroke-dasharray":dash},**extra))}/>')
 def rect(self,x,y,w,h,fill="none",stroke="#263e47",sw=.2,meta=None):
  extra={}
  if meta: extra={"data-item":meta["id"],"data-role":meta.get("role",""),"data-model":json.dumps(meta,separators=(",",":"))};self.items.append(meta)
  self.raw(f'<rect {attr(dict(x=x,y=y,width=w,height=h,fill=fill,stroke=stroke,**{"stroke-width":sw},**extra))}/>')
 def poly(self,points,fill="none",stroke="#263e47",sw=.2,meta=None,dash=None):
  extra={}
  if meta:extra={"data-item":meta["id"],"data-role":meta.get("role",""),"data-model":json.dumps(meta,separators=(",",":"))};self.items.append(meta)
  self.raw(f'<polygon {attr(dict(points=" ".join(f"{x:.6f},{y:.6f}" for x,y in points),fill=fill,stroke=stroke,**{"stroke-width":sw,"stroke-dasharray":dash},**extra))}/>')
 def circle(self,x,y,r,fill="none",stroke="#263e47",sw=.2,dash=None,meta=None):
  extra={}
  if meta:extra={"data-item":meta["id"],"data-role":meta.get("role",""),"data-model":json.dumps(meta,separators=(",",":"))};self.items.append(meta)
  self.raw(f'<circle {attr(dict(cx=x,cy=y,r=r,fill=fill,stroke=stroke,**{"stroke-width":sw,"stroke-dasharray":dash},**extra))}/>')
 def path(self,d,fill="none",stroke="#263e47",sw=.2,extra=None):
  self.raw(f'<path {attr(dict(d=d,fill=fill,stroke=stroke,**{"stroke-width":sw},**(extra or {})))}/>')
 def dim(self,a,b,label,offset=4):
  x,y=a;X,Y=b;dx=X-x;dy=Y-y;L=math.hypot(dx,dy);nx=-dy/L;ny=dx/L
  p=(x+nx*offset,y+ny*offset);q=(X+nx*offset,Y+ny*offset)
  self.line(x,y,p[0]+nx,p[1]+ny,color="#6d7c83",sw=.13);self.line(X,Y,q[0]+nx,q[1]+ny,color="#6d7c83",sw=.13)
  self.line(*p,*q,color="#4b6068",sw=.15)
  for e in [p,q]: self.line(e[0]-.6,e[1]-.6,e[0]+.6,e[1]+.6,color="#4b6068",sw=.2)
  angle=math.degrees(math.atan2(dy,dx))
  if angle>90:angle-=180
  if angle<-90:angle+=180
  self.text((p[0]+q[0])/2+nx*1.6,(p[1]+q[1])/2+ny*1.6,label,2.6,anchor="middle",angle=angle,halo=True)
  self.dims.append(dict(label=label,a=a,b=b,paper_length=L))
 def leader(self,a,b,label):
  self.line(*a,*b,color="#59707c",sw=.17);self.circle(*a,.35,fill="#59707c",sw=0);self.text(b[0]+1,b[1],label,2.5)
 def arrow(self,a,b,color="#b8483d"):
  self.line(*a,*b,color=color,sw=.3)
  dx=b[0]-a[0];dy=b[1]-a[1];ll=math.hypot(dx,dy);ux,uy=dx/ll,dy/ll
  self.poly([b,(b[0]-ux*1.2-uy*.5,b[1]-uy*1.2+ux*.5),(b[0]-ux*1.2+uy*.5,b[1]-uy*1.2-ux*.5)],fill=color,stroke="none")
 def save(self):
  root=f'<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" data-revision="R02" data-sheet="{self.num}"><style>text{{font-family:"Malgun Gothic","Noto Sans KR",Arial,sans-serif}}line,path,polygon,rect{{stroke-linejoin:round;stroke-linecap:round}}</style>'
  meta=html.escape(json.dumps({"sheet":self.num,"items":self.items,"dimensions":self.dims},ensure_ascii=False))
  out=root+f'<metadata>{meta}</metadata>'+"".join(self.parts)+"</svg>"
  (BASE/f"{self.num}-{self.title}.svg").write_text(out,encoding="utf-8")
  return self
class Plan:
 def __init__(self,s,x=152,y=169,k=4):self.s=s;self.x=x;self.y=y;self.k=k
 def pt(self,p):return self.x+p[0]*self.k,self.y-p[1]*self.k
 def rect(self,k,t,v,w,l,fill,meta=None,stroke="#263e47",dash=None):
  self.s.poly([self.pt(p) for p in localpoly(k,t,v,w,l)],fill,stroke,.18,meta,dash)
 def outline(self,half=6,end=36):
  pts=[];d=""
  for i,k in enumerate(["01","03","02"]):
   dx,dy=vec(ROOMS[k]["angle"]);p=(dy,-dx)
   corners=[(dx*12-p[0]*half,dy*12-p[1]*half),(dx*end-p[0]*half,dy*end-p[1]*half),(dx*end+p[0]*half,dy*end+p[1]*half),(dx*12+p[0]*half,dy*12+p[1]*half)]
   if i==0:
    x,y=self.pt(corners[0]);d=f"M{x},{y}"
   for c in corners[1:]:
    x,y=self.pt(c);d+=f"L{x},{y}"
   nxt=["03","02","01"][i];nx,ny=vec(ROOMS[nxt]["angle"]);pp=(ny,-nx)
   q=(nx*12-pp[0]*half,ny*12-pp[1]*half);X,Y=self.pt(q)
   radius=(12*math.sqrt(3)-half)*self.k
   d+=f"A{radius},{radius} 0 0 0 {X},{Y}"
  return d+"Z"
 def base(self,roof=False):
  s=self.s
  s.path(self.outline(6.3,36.3),fill="#1c343e",stroke="none",extra={"data-role":"outer-envelope"})
  s.path(self.outline(),fill="#f5f4f0",stroke="none",extra={"data-role":"inner-envelope","data-radius":R})
  for k,r in ROOMS.items():
   fill="#f2f4f4" if roof else {"01":"url(#wood)","02":"url(#concrete)","03":"url(#stone)"}[k]
   self.rect(k,0,12,12,24,fill,dict(id=f"G{k}",role="room",width=12,length=24,height=r["height"],angle=r["angle"]))
   for t in [-4,4]:self.rect(k,t,-.15,4,.3,"#1c343e",dict(id=f"D{k}{t:+}",role="portal-wall",height=6,opening_height=4.2))
  # Main entrance is a straight glazed opening inside the lower curved wall.
  a=self.pt((-1.5,ENTRY_Y-.3));b=self.pt((1.5,ENTRY_Y+.1))
  s.rect(min(a[0],b[0]),min(a[1],b[1]),abs(b[0]-a[0]),abs(b[1]-a[1]),fill="#f5f4f0",stroke="none")
  s.line(*self.pt((-1.5,ENTRY_Y)),*self.pt((1.5,ENTRY_Y)),color="#41a7c4",sw=.35)
  # Glazed window replaces the right wall of gallery03 for v=2..22.
  self.rect("03",6.15,12,.3,20,"#d7eff4",dict(id="W03",role="window",sill=.9,head=5.4,v0=2,v1=22))
  for v in SPEC["window"]["mullions"]:
   self.rect("03",6.15,v,.3,.3,"#273e47")
  if not roof:
   self.s.circle(self.x,self.y,4*self.k,stroke="#448aa5",sw=.18,dash="1 .7",meta=dict(id="KL",role="overhead-lobby-skylight",diameter=8))
   self.s.text(self.x,self.y-17.2,"KL",2.2,anchor="middle")
   for sky in SKIES:self.rect(sky["room"],sky["t"],sky["v"],sky["w"],sky["l"],"none",{**sky,"role":"overhead-skylight"},stroke="#448aa5",dash="1 .7")
   for a in ARTS:
    if a["face"]=="side":self.rect(a["room"],a["t"]-math.copysign(.06,a["t"]),a["v"],.12,a["w"],"#bb9360",{**a,"role":"artwork"})
    else:self.rect(a["room"],a["t"],23.94,a["w"],.12,"#bb9360",{**a,"role":"artwork"})
 def furniture(self):
  for p in PANELS:
   self.rect(p["room"],p["t"],p["v"],p["w"],p["l"],ROOMS[p["room"]]["wall"],{**p,"role":"panel"})
   x,y=self.pt(loc(p["room"],p["t"],p["v"]));self.s.text(x,y-2,p["id"],2.1,anchor="middle")
  for p in BENCHES:
   self.rect(p["room"],p["t"],p["v"],p["w"],p["l"],"#b7a589",{**p,"role":"bench"})
   x,y=self.pt(loc(p["room"],p["t"],p["v"]));self.s.text(x,y+3,p["id"],2,anchor="middle")
  for p in CASES:
   self.rect("03",p["t"],p["v"],1.2,1.2,"#ecf5f5",{**p,"role":"case"})
   self.rect("03",p["t"],p["v"],.6,.6,"#bcb6a8")
   x,y=self.pt(loc("03",p["t"],p["v"]));self.s.text(x,y+3,p["id"],2,anchor="middle")
  self.s.circle(self.x,self.y,1.8*self.k,"#e1dfd5",sw=.25)
  self.s.rect(self.x-.075*self.k,self.y-1.2*self.k,.15*self.k,2.4*self.k,fill="#ab9871")
  for b in SPEC["lobby"]["benches"]:
   pp=[]
   for rad,aa in [(5.3,b["angle"]-20),(5.3,b["angle"]+20),(4.7,b["angle"]+20),(4.7,b["angle"]-20)]:
    dx,dy=vec(aa);pp.append(self.pt((dx*rad,dy*rad)))
   aa,bb,cc,dd=pp
   path=f"M{aa[0]},{aa[1]}A{5.3*self.k},{5.3*self.k} 0 0 0 {bb[0]},{bb[1]}L{cc[0]},{cc[1]}A{4.7*self.k},{4.7*self.k} 0 0 1 {dd[0]},{dd[1]}Z"
   self.s.path(path,fill="#b7a589",extra={"data-item":b["id"],"data-role":"arc-bench","data-model":json.dumps(b)})
   x,y=self.pt(tuple(v*5.65 for v in vec(b["angle"])));self.s.text(x,y,b["id"],2.2,anchor="middle")
  for c in COLS:
   x,y=self.pt((c["x"],c["y"]));self.s.circle(x,y,.15*self.k,fill="#3b5961",meta={**c,"role":"plan-column"})
   self.s.text(x+2,y,c["id"],2)
 def section(self,k,v,id):
  a=self.pt(loc(k,-7,v));b=self.pt(loc(k,7,v))
  self.s.line(*a,*b,color="#b8483d",sw=.2,dash="2 .8 .3 .8",meta=dict(id=id,role="cross-section-line",room=k,v=v,look="+v"))
  dx,dy=vec(ROOMS[k]["angle"])
  for p in [a,b]:
   self.s.arrow(p,(p[0]+dx*3,p[1]-dy*3));self.s.text(p[0],p[1]-1,id,2.5,color="#b8483d",anchor="middle")
 def longsection(self,k,id):
  a=self.pt(loc(k,0,-1));b=self.pt(loc(k,0,25))
  self.s.line(*a,*b,color="#ae5045",sw=.15,dash="2 .8 .3 .8",meta=dict(id=id,role="long-section-line",room=k,t=0,look="+t"))
  p=self.pt(loc(k,0,23));q=self.pt(loc(k,1.1,23))
  self.s.arrow(p,q);self.s.text(q[0]+1,q[1]-1,id,2.5,color="#ae5045")
def sidebox(s):
 s.line(300,28,300,274,color="#a8b7bd",sw=.2)
 s.text(307,34,"공통 설계 기준",4,weight="bold")
 yy=43
 for k,r in ROOMS.items():
  s.text(307,yy,f"CONCEPT {k}  {r['name']}",3.2,weight="bold")
  s.text(307,yy+6,f"12000 × 24000 / H{fmt(r['height'])}",3)
  yy+=19
 for text in ["외벽·전시 벽 300","바닥판 200 / 지붕판 300","전시실 진입 폭4000 / H4200","주출입구 폭3000 / H3000","원형 중심 존 Ø18000 / H6000","중앙 받침대 Ø3600 / H450"]:
  s.text(307,yy,text,2.8);yy+=7
 s.line(307,yy,404,yy,color="#b5c1c7",sw=.15);yy+=8
 for text in ["원형 존은 로비의 중심 기준선.","실제 로비 외곽은 세 곡선으로 연결.","곡선 F1~F3 내부 R14784.61","곡선 중심: F1 (20784.61,12000)","F2 (0,-24000)","F3 (-20784.61,12000)","기둥 C01~03: Ø300 / H6000","곡선 벤치 BL1~3: R5000 / 40°","좌판 깊이600 / H450"]:
  s.text(307,yy,text,2.55);yy+=6.2
 s.line(307,yy,404,yy,color="#b5c1c7",sw=.15);yy+=8
 for text in ["S1~S3: 가로 단면 → A02","S4~S6: 길이 단면 → A03","S7: 로비 단면 → A02","천창·보·조명 위치 → A04","전시 요소 상세 규격 → A05"]:
  s.text(307,yy,text,2.7);yy+=6
def master():
 s=Sheet("A01","전시 공간 통합 평면도","세 콘셉트·창·전시 요소·단면 위치를 같은 기준으로 연결","1:250 · A3")
 p=Plan(s);p.base();p.furniture()
 s.circle(p.x,p.y,36,stroke="#778f99",sw=.18,dash="1.4 .8")
 for k,r in ROOMS.items():
  px,py=vec(r["angle"]);angle=math.degrees(math.atan2(px,py))
  if angle>90:angle-=180
  if angle<-90:angle+=180
  x,y=p.pt(loc(k,0,3));s.text(x,y,f"CONCEPT {k}",3,anchor="middle",weight="bold",angle=angle,halo=True)
  x,y=p.pt(loc(k,0,2));s.text(x,y,r["name"],2.6,anchor="middle",angle=angle,halo=True)
  s.dim(p.pt(loc(k,-6,24)),p.pt(loc(k,6,24)),"12000",-5)
  s.dim(p.pt(loc(k,6,0)),p.pt(loc(k,6,24)),"24000",5)
  s.dim(p.pt(loc(k,-2,0)),p.pt(loc(k,2,0)),"4000",3)
  p.longsection(k,{"01":"S4","02":"S5","03":"S6"}[k])
 for ss in SECTIONS[:3]:p.section(ss["room"],ss["v"],ss["id"])
 s.dim(p.pt((-9,0)),p.pt((9,0)),"Ø18000 중심 기준",8)
 s.dim(p.pt((-1.5,ENTRY_Y)),p.pt((1.5,ENTRY_Y)),"3000",6)
 s.text(p.x,p.pt((0,ENTRY_Y))[1]+12,"주출입구",2.8,anchor="middle")
 s.line(*p.pt((0,-10)),*p.pt((0,12.5)),color="#b8483d",sw=.15,dash="2 .8 .3 .8",meta=dict(id="S7",role="lobby-section-line",x=0,look="-x"))
 s.text(p.x-3,p.pt((0,8.5))[1],"S7",2.5,color="#b8483d")
 s.arrow(p.pt((0,8.5)),p.pt((-1,8.5)))
 a=p.pt((20.78460969,12));b=p.pt((20.78460969-R*math.cos(math.radians(30)),12-R*.5))
 s.circle(*a,.45,fill="#6a858e");s.line(*a,*b,color="#6a858e",sw=.15)
 s.text(a[0]+2,a[1]-2,"F1  R14784.61",2.6)
 s.text(14,275,"실선: 벽·가구   파란 점선: 천창   붉은 선: 단면 절단선   회색 원: 로비 중심 기준",2.6)
 sidebox(s);s.save()
def floorsection(s,k,v,x,base,sc,id):
 r=ROOMS[k];H=r["height"];px=lambda t:x+(t+6)*sc;py=lambda z:base-z*sc
 s.rect(px(-6.3),py(H),.3*sc,H*sc,fill=r["wall"],meta=dict(id=f"{id}-wall-left",role="section-wall",height=H))
 if k!="03":s.rect(px(6),py(H),.3*sc,H*sc,fill=r["wall"])
 else:
  for z0,z1 in [(0,.9),(5.4,6)]:s.rect(px(6),py(z1),.3*sc,(z1-z0)*sc,fill=r["wall"])
  s.rect(px(6),py(5.4),.3*sc,4.5*sc,fill="#d7eff4",stroke="#388fae",meta=dict(id="W03",role="cross-window",sill=.9,head=5.4))
 s.rect(px(-6.3),base,12.6*sc,.2*sc,fill="#7f9096")
 gaps=[]
 if k=="02":gaps=[(-3.6,-2.4),(2.4,3.6)]
 cuts=[-6]+[a for g in gaps for a in g]+[6]
 for aa,bb in zip(cuts[::2],cuts[1::2]):s.rect(px(aa),py(H+.3),(bb-aa)*sc,.3*sc,fill="#61757d")
 for aa,bb in gaps:
  s.rect(px(aa),py(H+.3),(bb-aa)*sc,.3*sc,fill="#d7eff4",stroke="#388fae")
 if k=="02":s.rect(px(-6),py(5),12*sc,.6*sc,fill="#8d9696",meta=dict(id="BEAM-8",role="cross-beam",bottom=4.4,top=5))
 if k=="01":
  for t in [-6,5.7]:s.rect(px(t),py(5.55),.3*sc,.15*sc,fill="#d1d0c5")
 for pp in PANELS:
  if pp["room"]==k and abs(pp["v"]-v)<pp["l"]/2+1e-8:
   s.rect(px(pp["t"]-pp["w"]/2),py(pp["h"]),pp["w"]*sc,pp["h"]*sc,fill=r["wall"],meta={**pp,"role":"cross-panel"})
   s.text(px(pp["t"]),py(pp["h"])-2,pp["id"],2.2,anchor="middle")
 for cc in CASES:
  if k=="03" and abs(cc["v"]-v)<.6:
   s.rect(px(cc["t"]-.6),py(2.4),1.2*sc,2.4*sc,fill="#eef6f6",meta={**cc,"role":"cross-case"})
   s.rect(px(cc["t"]-.3),py(1),.6*sc,sc,fill="#cbc8bd")
   s.circle(px(cc["t"]),py(1.45),.25*sc,fill="#c4ab7b")
   s.rect(px(cc["t"]-.2),py(1.2),.4*sc,.2*sc,fill="#c4ab7b")
   s.text(px(cc["t"]),py(2.4)-2,cc["id"],2.2,anchor="middle")
 for tr in TRACKS:
  if tr["room"]==k:
   s.rect(px(tr["t"]-.04),py(tr["h"]+.04),.08*sc,.08*sc,fill="#8c4f35")
 s.dim((px(-6),base),(px(6),base),"12000",12 if k=="03" else 7)
 s.dim((px(-6),base),(px(-6),py(H)),fmt(H),-5)
 if k=="03":
  for a,b,tx in [(-6,-3.6,"2400"),(-3.6,-2.4,"1200"),(-2.4,2.4,"4800"),(2.4,3.6,"1200"),(3.6,6,"2400")]:s.dim((px(a),base),(px(b),base),tx,5)
  s.dim((px(6.3),py(.9)),(px(6.3),py(5.4)),"4500",-4)
 for z,tx in [(H,f"천장 {fmt(H)}"),(r["track"],f"조명 {fmt(r['track'])}")]:
  s.line(px(4.3),py(z),px(5.8),py(z),color="#798e98",sw=.15);s.text(px(5.9),py(z)-1,tx,2.2,anchor="end")
 if k=="02":
  s.text(px(0),py(4.4)+4,"보 아래4400",2.4,anchor="middle");s.text(px(0),py(3.6)+5,"전시 벽 H3600",2.4,anchor="middle")
 s.text(x+60,153,f"{id}: 입구에서{fmt(v)} / 보는 방향 +길이",2.7,anchor="middle")
def cross():
 s=Sheet("A02","전시실·로비 가로 단면도","평면 A01의 S1~S3·S7과 같은 절단 위치 · 원근 없이 표시","전시실1:100 / 로비1:150 · A3")
 for k,v,x,id in [("01",8,15,"S1"),("02",8,150,"S2"),("03",12,285,"S3")]:
  s.text(x,36,f"{id}  CONCEPT {k}  {ROOMS[k]['name']}",3.6,weight="bold")
  floorsection(s,k,v,x,125,10,id)
 s.line(10,161,410,161,color="#b5c1c7",sw=.2)
 s.text(15,172,"S7  로비 단면 — 중심선을 남쪽에서 북쪽까지 절단",3.5,weight="bold")
 sc=1000/150; xx=lambda y:27+(y-ENTRY_Y)*sc;yy=lambda z:253-z*sc
 s.rect(xx(ENTRY_Y),yy(6.3),(12-ENTRY_Y)*sc,.3*sc,fill="#627983")
 s.rect(xx(-4),yy(6.3),8*sc,.3*sc,fill="#d7eff4",stroke="#388fae",meta=dict(id="KL",role="lobby-skylight",diameter=8))
 s.rect(xx(ENTRY_Y),253,(12-ENTRY_Y)*sc,.2*sc,fill="#8e9d9e")
 s.rect(xx(ENTRY_Y-.15),yy(6),.3*sc,3*sc,fill="#627983")
 s.line(xx(ENTRY_Y),253,xx(ENTRY_Y),yy(3),color="#3c9ab5",sw=.3)
 s.rect(xx(11.7),yy(6),.3*sc,1.8*sc,fill="#627983")
 s.rect(xx(-7.65),yy(6),.3*sc,6*sc,fill="#627983",meta={**COLS[2],"role":"lobby-section-column"})
 s.rect(xx(-1.8),yy(.45),3.6*sc,.45*sc,fill="#c3c2b6",meta=dict(id="PL-L",role="lobby-plinth",diameter=3.6,height=.45))
 s.circle(xx(0),yy(1.65),1.2*sc,fill="#af9b6d",sw=.2);s.circle(xx(0),yy(1.65),1.05*sc,fill="white",sw=.2)
 s.rect(xx(4.7),yy(.45),.6*sc,.45*sc,fill="#b7a589",meta={**SPEC["lobby"]["benches"][0],"role":"arc-bench-section"})
 for v in [-9,9]:s.line(xx(v),yy(6.7),xx(v),258,color="#83949e",sw=.12,dash="1 .7")
 s.dim((xx(-9),253),(xx(9),253),"Ø18000 중심 기준",13)
 s.dim((xx(9),yy(6.3)),(xx(12),yy(6.3)),"3000", -6)
 s.dim((xx(ENTRY_Y),253),(xx(ENTRY_Y),yy(6)),"6000",-5)
 s.text(xx(-7.5),yy(6)-2,"C03 Ø300",2.6,anchor="middle")
 s.text(xx(0),yy(2.9)-2,"중앙 링 Ø2400",2.5,anchor="middle")
 s.text(xx(5),yy(.45)-2,"BL1 / H450",2.5,anchor="middle")
 s.text(204,178,"같은 평면에서 확인되는 요소",3.5,weight="bold")
 notes=["S1: P01-01·02의 얇은 절단면","S2: P02-01·02의 넓은 절단면","S3: V03·V08와 오른쪽 창 W03","S7: 북쪽 곡선 벤치 BL1, 기둥 C03","나머지 벤치·기둥은 절단선 밖에 위치","원형 존 Ø18000은 중심 기준선","실제 남쪽 입구는 곡선 F2의 개구부","중앙 링: 받침대450 + 조형물2400","천창 KL Ø8000 / 로비 천장6000","창 W03 하단900 / 상단5400","전시 요소 번호는 A01·A05와 동일"]
 for i,t in enumerate(notes):s.text(204,189+i*6.5,t,2.9)
 s.save()
def longitudinals():
 s=Sheet("A03","전시실 길이 단면·창과 높이 연결","평면 A01의 S4~S6 · 로비 중심부터 전시실 끝까지 · 오른쪽 벽 방향으로 봄","1:150 · A3")
 sc=1000/150
 for i,k in enumerate(ROOMS):
  r=ROOMS[k];base=94+i*76;px=lambda u:285-u*sc;py=lambda z:base-z*sc
  def lr(x,y,w,h,**kw):s.rect(x-w,y,w,h,**kw)
  s.text(15,33+i*76,f"S{i+4}  CONCEPT {k}  {r['name']}",3.5,weight="bold")
  lr(px(0),base,36.3*sc,.2*sc,fill="#93a1a4")
  lr(px(0),py(6.3),12*sc,.3*sc,fill="#647981")
  lr(px(0),py(6.3),4*sc,.3*sc,fill="#d7eff4",stroke="#388fae",meta=dict(id="KL",role="long-lobby-skylight",diameter=8))
  lr(px(3.6),py(6),.3*sc,6*sc,fill="#eff1ef",stroke="#9ba9ac",meta=dict(id=f"C{i+1:02}",role="long-projected-column",height=6,diameter=.3))
  lr(px(11.7),py(6),.3*sc,1.8*sc,fill="#647981")
  H=r["height"]
  lr(px(12),py(H+.3),24.3*sc,.3*sc,fill="#647981")
  if k=="01":
   for sky in SKIES:
    if sky["room"]==k:
     lr(px(12+sky["v"]-sky["l"]/2),py(H+.3),sky["l"]*sc,.3*sc,fill="#d7eff4",stroke="#388fae",meta={**sky,"role":"long-skylight"})
  if k=="02":
   for v in SPEC["beams"]["v"]:lr(px(12+v-.15),py(5),.3*sc,.6*sc,fill="#8b9698",meta=dict(id=f"T{fmt(v)}",role="long-beam",v=v,bottom=4.4,top=5))
   s.line(px(12),py(5.3),px(12),py(6.3),color="#263e47",sw=.4)
   s.text(px(12)+2,py(5.5),"높이 차1000",2.4)
  if k=="03":
   lr(px(14),py(5.4),20*sc,4.5*sc,fill="#f0f8fa",stroke="#67a1b5",meta=dict(id="W03",role="long-window",v0=2,v1=22,sill=.9,head=5.4))
   for v in SPEC["window"]["mullions"]:lr(px(12+v-.15),py(5.4),.3*sc,4.5*sc,fill="#a7b5b7")
  lr(px(36),py(H),.3*sc,H*sc,fill=r["wall"])
  lr(px(0),py(.45),1.8*sc,.45*sc,fill="#c3c2b6")
  lr(px(4.7),py(.45),.6*sc,.45*sc,fill="#b7a589",meta=dict(id=f"BL{i+1}",role="long-lobby-bench",radius=5,height=.45))
  for p in PANELS:
   if p["room"]==k and p["t"]>0:
    lr(px(12+p["v"]-p["l"]/2),py(p["h"]),p["l"]*sc,p["h"]*sc,fill="#eff0ed",stroke=ROOMS[k]["wall"],sw=.22,meta={**p,"role":"long-panel"})
    s.text(px(12+p["v"]),py(p["h"])-2,p["id"],2.2,anchor="middle")
    if k=="01":lr(px(12+p["v"]-.75),py(2.5),1.5*sc,2*sc,fill="#ccb98e",stroke="#8d7747")
  for b in BENCHES:
   if b["room"]==k and b["t"]>0:lr(px(12+b["v"]-1),py(.45),2*sc,.45*sc,fill="#b7a589",meta={**b,"role":"long-bench"})
  if k=="03":
   for c in CASES:
    if c["t"]>0:
     lr(px(12+c["v"]-.6),py(2.4),1.2*sc,2.4*sc,fill="none",stroke="#4c6974",meta={**c,"role":"long-case"})
     lr(px(12+c["v"]-.3),py(1),.6*sc,sc,fill="#d0cdc2")
     s.circle(px(12+c["v"]),py(1.45),.25*sc,fill="#c4ab7b");lr(px(12+c["v"]-.2),py(1.2),.4*sc,.2*sc,fill="#c4ab7b")
     s.text(px(12+c["v"]),py(2.4)-2,c["id"],2.2,anchor="middle")
  s.line(px(14),py(r["track"]),px(34),py(r["track"]),color="#a16447",sw=.45)
  s.dim((px(0),base),(px(9),base),"9000",-7);s.dim((px(9),base),(px(12),base),"3000",-7);s.dim((px(12),base),(px(36),base),"24000",-7)
  s.dim((px(36.3),base),(px(36.3),py(H)),fmt(H),-5)
  for j,t in enumerate([f"전시실 H{fmt(H)}",f"조명 높이{fmt(r['track'])}","입구 H4200 / 폭4000","로비 H6000"]):s.text(311,56+i*76+j*6.5,t,2.8)
  note={"01":"천창3개 길이3600","02":"천창은 좌우3000 위에 위치","03":"창 뒤쪽에 벽걸이 작품 없음"}[k]
  s.text(311,87+i*76,note,2.6)
 s.text(15,271,"화살표 방향으로 오른쪽 벽을 바라보므로 전시실 끝은 왼쪽에 표시. 밝은 윤곽은 절단선 뒤쪽 요소.",2.6)
 s.text(15,277,"반대 줄은 평면에서 확인. 중앙 조형물은 A02 S7에 상세 표시.",2.6)
 s.save()


def roof():
 s=Sheet("A04","천장·천창·조명 배치도","A01과 같은 방향·위치 · 모든 천창과 보, 조명 레일을 연계","1:250 · A3")
 p=Plan(s);p.base(roof=True)
 for sky in SKIES:
  p.rect(sky["room"],sky["t"],sky["v"],sky["w"],sky["l"],"#d7eff4",{**sky,"role":"roof-skylight"},stroke="#388fae")
  x,y=p.pt(loc(sky["room"],sky["t"],sky["v"]));s.text(x,y-2,sky["id"],2.2,anchor="middle")
 for v in SPEC["beams"]["v"]:
  p.rect("02",0,v,12,.3,"none",dict(id=f"T{fmt(v)}",role="roof-beam",v=v,bottom=4.4,top=5),stroke="#828f90",dash="1 .7")
 for tr in TRACKS:
  p.rect(tr["room"],tr["t"],tr["v"],tr["w"],tr["l"],"#a46549",{**tr,"role":"roof-track"},stroke="#a46549")
  x,y=p.pt(loc(tr["room"],tr["t"],22));s.text(x,y,tr["id"],2.1,anchor="middle")
 s.circle(p.x,p.y,4*p.k,fill="#d7eff4",stroke="#388fae",sw=.3,meta=dict(id="KL",role="roof-lobby-skylight",diameter=8));s.text(p.x,p.y,"KL Ø8000",3,anchor="middle")
 for c in COLS:
  x,y=p.pt((c["x"],c["y"]));s.circle(x,y,.15*p.k,fill="#3b5961",meta={**c,"role":"roof-column"});s.text(x+2,y,c["id"],2)
 for k,r in ROOMS.items():
  x,y=p.pt(loc(k,0,0));s.text(x,y-3,f"CONCEPT {k}",2.9,anchor="middle",weight="bold")
  s.dim(p.pt(loc(k,-6,24)),p.pt(loc(k,6,24)),"12000",-5)
  s.dim(p.pt(loc(k,6,0)),p.pt(loc(k,6,24)),"24000",5)
 s.line(300,28,300,274,color="#a8b7bd",sw=.2)
 texts=[("천창 배치",4,True),("01: K01-1~3 / 2400 ×3600",3,False),("입구부터 중심4000·12000·20000",2.7,False),
 ("02: K02-1~2 / 1200 ×20000",3,False),("좌우 중심±3000 / 길이2000~22000",2.7,False),
 ("로비 KL: 중앙 Ø8000",3,False),("천창 유리 상단: 천장 높이+300",2.7,False),
 ("천장 보·조명",4,True),("02 보: 폭300 / 깊이600",3,False),("위치4000·8000·12000·16000·20000",2.55,False),("보 아래4400 / 보가 천창 아래 통과",2.7,False),
 ("01 조명: 높이5200 / 좌우±3800",2.7,False),("02 조명: 높이4200 / 좌우±3800",2.7,False),("03 조명: 높이5400 / 좌우-3000·0·3000",2.55,False),("조명 길이: 입구부터2000~22000",2.7,False),
 ("연결부 높이",4,True),("로비6000 → 01·03은6000",2.8,False),("로비6000 → 02는5000",2.8,False),("높이 차는 전시실 입구에서 전환",2.7,False),("A03 S5에서1000 차이를 확인",2.7,False)]
 yy=36
 for t,z,b in texts:s.text(307,yy,t,z,weight="bold" if b else "normal");yy+=10 if b else 7.3
 s.text(14,275,"파랑: 천창   회색 점선: 보   갈색: 조명 레일   03 창은 평면과 같은 외곽 벽",2.7)
 s.save()
def details():
 s=Sheet("A05","전시 요소 규격·로비 곡선 상세","A01의 요소 번호와 직접 연결 · 모든 크기와 높이를 명시","요소별 축척 표시 · A3")
 s.text(14,35,"P01·P02 전시 벽  |  1:50",3.6,weight="bold")
 sc=20;x=20;base=127
 s.rect(x,base-3.6*sc,3*sc,3.6*sc,fill="#214550")
 s.rect(x+.75*sc,base-2.5*sc,1.5*sc,2*sc,fill="#cbb58b",stroke="#9f814e")
 s.dim((x,base),(x+3*sc,base),"3000",7);s.dim((x,base),(x,base-3.6*sc),"3600",-6)
 s.rect(101,base-3.6*sc,.3*sc,3.6*sc,fill="#989e9a");s.dim((101,base-3.6*sc),(107,base-3.6*sc),"300",-5)
 s.text(14,151,"액자1500 ×2000 / 작품 중심 높이1500",2.8)
 s.text(145,35,"B01·B02 일반 벤치  |  1:20",3.6,weight="bold")
 sc=50;x=150;base=86
 s.rect(x,base-.45*sc,2*sc,.1*sc,fill="#bea988")
 for xx in [x+.2*sc,x+1.6*sc]:s.rect(xx,base-.35*sc,.2*sc,.35*sc,fill="#4a6165")
 s.dim((x,base),(x+2*sc,base),"2000",7);s.dim((x+2*sc,base),(x+2*sc,base-.45*sc),"450",5)
 s.rect(x,112,2*sc,.6*sc,fill="#bea988");s.dim((x+2*sc,112),(x+2*sc,112+.6*sc),"600",-6)
 s.text(145,151,"B01-01·02 / B02-01·02：각2개",2.8)
 s.text(278,35,"V01~V10 유리 진열장  |  1:25",3.6,weight="bold")
 sc=40;x=291;base=141
 s.rect(x,base-2.4*sc,1.2*sc,2.4*sc,fill="#eef7f8",stroke="#334f59",sw=.8,meta=dict(id="V-detail",role="case-detail",width=1.2,height=2.4))
 s.rect(x+.3*sc,base-sc,.6*sc,sc,fill="#c6c4b8")
 s.circle(x+.6*sc,base-1.45*sc,.25*sc,fill="#c4ab7b");s.rect(x+.4*sc,base-1.2*sc,.4*sc,.2*sc,fill="#c4ab7b")
 s.dim((x,base),(x+1.2*sc,base),"1200",6);s.dim((x,base),(x,base-2.4*sc),"2400",-6)
 s.rect(360,71,1.2*sc,1.2*sc,fill="#eef7f8");s.rect(360+.3*sc,71+.3*sc,.6*sc,.6*sc,fill="#c6c4b8")
 s.dim((360,71),(408,71),"1200",-6);s.dim((372,83),(396,83),"600",3)
 s.text(352,132,"받침대600×600×H1000",2.45);s.text(352,139,"프레임20 / 유리6",2.45)
 s.line(10,163,410,163,color="#b5c1c7",sw=.2)
 s.text(14,175,"BL1~BL3 곡선 벤치  |  1:100",3.6,weight="bold")
 cx,cy,sc=78,250,10;points=[]
 for rad,aa in [(5.3,70),(5.3,110),(4.7,110),(4.7,70)]:
  dx,dy=vec(aa);points.append((cx+rad*dx*sc,cy-rad*dy*sc))
 aa,bb,cc,dd=points
 arc=f"M{aa[0]},{aa[1]}A53,53 0 0 0 {bb[0]},{bb[1]}L{cc[0]},{cc[1]}A47,47 0 0 1 {dd[0]},{dd[1]}Z"
 s.path(arc,fill="#bea988",extra={"data-item":"BL-detail","data-role":"arc-bench-detail"});s.circle(cx,cy,.5,fill="#506b72")
 for aa in [70,110]:dx,dy=vec(aa);s.line(cx,cy,cx+5.3*dx*sc,cy-5.3*dy*sc,color="#8a9ea5",sw=.15,dash="1 .7")
 s.text(cx,cy-30,"R5000 / 40°",3,anchor="middle");s.dim((cx,cy-4.7*sc),(cx,cy-5.3*sc),"600",-8)
 s.text(14,266,"좌판 H450 / 중심 방향90°·210°·330°",2.8)
 s.text(155,175,"F1~F3 로비 외곽 곡선  |  좌표·반경",3.6,weight="bold")
 rows=["내부 반경 R14784.60969 / 벽 두께300","외부 반경 R14484.60969 / 원호각60°","F1 중심 (20784.60969,12000)","F2 중심 (0,-24000)","F3 중심 (-20784.60969,12000)","세 곡선은 전시실 측벽에 접선으로 연결","로비 중심 기준원 Ø18000 / 좌표 (0,0)","주출입구 중심 (0,"+f"{ENTRY_Y*1000:.2f}"+") / 폭3000","기둥 C01 (6495.19,3750)","C02 (-6495.19,3750) / C03 (0,-7500)","기둥 Ø300 / H6000 / 중앙 받침대 Ø3600×H450"]
 for i,t in enumerate(rows):s.text(155,185+i*7.4,t,2.85)
 s.save()
master();cross();longitudinals();roof();details()
print(json.dumps({"created":[p.name for p in BASE.glob("A*.svg")],"radius_mm":R*1000,"entry_y_mm":ENTRY_Y*1000},ensure_ascii=False))

