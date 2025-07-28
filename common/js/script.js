import { BrowserQRCodeReader } from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.0.10/+esm";

class Util{
    static post(method, url, data=null){
        return new Promise((res, rej)=>{
            let req=new XMLHttpRequest();
            req.open(method, url);
            req.addEventListener("readystatechange", e=>{
                if(req.readyState===req.DONE){
                    let json=JSON.parse(req.responseText);
                    if(req.status===200) res(json);
                    else rej(json);
                }
            })

            if(data){
                let form=new FormData();
                Object.keys(data).forEach(key=>form.append(key, data[key]));
                req.send(form);
            } else req.send();
        })
    }
}

export class QRcode{
    constructor(){
        this.QRdata=null;
        this.QRobj=null;

        this.codeReader=new BrowserQRCodeReader();
        this.videoElement=document.querySelector("#video");

        this.reader();
        this.load();
    }

    reader(){
        this.codeReader.decodeFromVideoDevice(null, this.videoElement, (result, error, controls) => {
            if (result) {
                if(this.QRdata) return;
                
                // #region split string
                // this.QRdata=result.getText().split("@");
                // this.QRobj={
                //     grade: this.QRdata[0],
                //     class: this.QRdata[1],
                //     number: this.QRdata[2],
                //     name: this.QRdata[3]
                // }
                // console.log(this.QRobj)
                // #endregion
                    
                // #region json decode
                this.QRdata=result.getText();
                this.QRobj=JSON.parse(this.QRdata);
                console.log(this.QRobj)

                this.load();

                setTimeout(()=>{
                    this.QRdata=null;
                    this.QRobj=null;
                }, 1500);
                // #endregion

                // controls.stop(); // 인식 후 종료
            }
            // if (error) {
            //     // 인식 실패 에러
            //     console.warn(error);
            // }
        });
    }

    load(){
        // validation  init
        $($(".infoText")[0]).text("이름: ");
        $($(".infoText")[1]).text("학번: ");
        $($(".infoText")[2]).text("학과: ");
        $(".area").css("box-shadow", "0 0.5rem 1rem rgba(0, 0, 0, 0.15)");
        if(!this.QRobj) return;

        // shadow
        const gradeColorMap = {
            "1": "rgba(255, 94, 87, 0.4)",
            "2": "rgba(255, 179, 71, 0.5)",
            "3": "rgba(79, 195, 247, 0.5)"
        };
        const shadowColor = gradeColorMap[this.QRobj.grade];
        if (shadowColor) $(".area").css("box-shadow", `0 0 1.5rem 1rem ${shadowColor}`);

        // text
        $($(".infoText")[0]).text(`이름: ${this.QRobj.name}`);
        $($(".infoText")[1]).text(`학번: ${this.QRobj.grade}${this.QRobj.class.padStart(2, '0')}${this.QRobj.number}`);

        let major=null;
        switch(Number(this.QRobj.class)){
            case 1:
            case 2:
                major="AI융합전자과"; break;
            case 3:
            case 4:
                major="스마트자동화과"; break;
            case 5:
            case 6:
                major="디자인콘텐츠과"; break;
            case 7:
            case 8:
                major="IT소프트웨어과"; break;
        }
        $($(".infoText")[2]).text(`학과: ${major}`);
    }
}

export class Input{
    constructor(){
        this.gids = [
            0,
            420882028,
            1476063395,
            1972379934,
            633847506,
            419659145,
            991516872,
            663823589,
            971892339,
            270072902,
            534502800,
            1245418035,
            1632286854,
            742757925,
            1902254510,
            780529177,
            791243012,
            1369022158,
            7316150,
            1028168809,
            1988054717,
            478812933,
            288004330,
            340090994
        ];

        this.init();
    }

    async init(){
        let responses = await Promise.all(
            this.gids.map((gid) => fetch(`https://docs.google.com/spreadsheets/d/1HAfJWCaenNya5hio_AqxuHKNDQGgJvDPy2q8SzXUn1s/export?format=csv&gid=${gid}`).then(res => res.text()))
        );

        responses = responses.reduce((acc, sheet) => {
            let data = [...sheet.replaceAll(/\r/g, "").split("\n")].reduce((acc, value, index) => {
                if(index === 0) return acc;
    
                let datas = value.split(",");
                acc.push({
                    class: datas[0],
                    grade: datas[1],
                    number: datas[2],
                    name: datas[3],
                })
    
                return acc;
            }, []);

            return [...acc, ...data];
        }, []);

        console.log(responses);

        this.event();
    }

    event(){
        $("#studentForm input").on("input", e=>e.target.value=e.target.value.trim().replaceAll(/[^\d]/g, ""));

        document.querySelector("#studentForm").addEventListener("submit", e=>{
            e.preventDefault();

            const studentNumber=document.querySelector("#studentForm input").value;
            
        })
    }
}

export class Meal{
    constructor(){
        this.meal=[];
        this.startDate=null;
        this.currentDate=null;
        this.endDate=null;

        this.init();
    }

    async init(){
        // get current week
        this.currentDate=new Date("2025-07-31");
        this.startDate=new Date(this.currentDate);
        this.startDate.setDate(this.currentDate.getDay()===1 ? this.currentDate.getDate()-3 : this.currentDate.getDate()-1);
        this.endDate=new Date(this.currentDate);
        this.endDate.setDate(this.currentDate.getDay()===5 ? this.currentDate.getDate()+3 : this.currentDate.getDate()+1);

        // 급식표 api
        this.meal=await Util.post("GET", `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=71038ba943b743dba2ec541f58c0fdd6&ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530899&MLSV_FROM_YMD=${this.ISOString(this.startDate)}&MLSV_TO_YMD=${this.ISOString(this.endDate)}&Type=json`);
        if(this.meal.RESULT) return this.empty();
        
        this.meal=this.meal.mealServiceDietInfo[1].row;
        let tempMeal=[this.ISOString(this.startDate), this.ISOString(this.currentDate), this.ISOString(this.endDate)];
        
        this.meal=tempMeal.map(value=>({
            date: value,
            content: this.meal.find(item=>item.MLSV_YMD===value)
        }))
        
        console.log(this.meal);

        this.load();
    }
    
    load(){
        let days=['월요일', '화요일', '수요일', '목요일', '금요일'];
        
        $(".lunchMenu thead tr").html(
            this.meal.map(value=>`
                <th scope="col" class="fx-2 fw-bold text-center">${days[new Date(value.date.slice(0, 4), (value.date.slice(4, 6))-1, value.date.slice(6, 8)).getDay()-1]} <span class="fx-n1 text-secondary">(${parseInt(value.date.slice(4, 6))}.${parseInt(value.date.slice(6, 8))})</span></th>
            `)
        )

        $(".lunchMenu tbody tr").html(
            this.meal.map(value=>{
                if(value.content) return `<td class="fx-n1 text-center lh-base">${value.content.DDISH_NM}</td>`;
                else return `<td class="fx-1 text-center lh-base">(없음)</td>`;
            })
        )
    }

    empty(){
        let days=['월요일', '화요일', '수요일', '목요일', '금요일'];
        let dates=[this.ISOString(this.startDate), this.ISOString(this.currentDate), this.ISOString(this.endDate)];
        console.log(dates)
        
        $(".lunchMenu thead tr").html(
            dates.map(value=>`
                <th scope="col" class="fx-1 fw-bold text-center">${days[new Date(value.slice(0, 4), (value.slice(4, 6))-1, value.slice(6, 8)).getDay()-1]} <span class="fx-n2 text-secondary">(${parseInt(value.slice(4, 6))}.${parseInt(value.slice(6, 8))})</span></th>
            `)
        )
    }

    ISOString(value){
        return value.toISOString().slice(0, 10).replaceAll(/[^\d]/g, "");
    }
}

export class DateUtils{
    constructor(){
        this.currentDate=null;
        this.major=[];
        this.dates=[];

        this.init();
    }

    init(){
        // dates (thead)
        this.currentDate=new Date("2025-07-31");
        this.dates=[this.currentDate.getMonth(), this.currentDate.getMonth()+1, this.currentDate.getMonth()+2];

        // majors (tbody)
        this.major=['전자과', '자동화과', '디자인과', '소프트과'];

        for(let i=3; i<this.currentDate.getMonth()+1; i++){
            this.major.push(this.major.shift());
        }

        this.order = [
            [this.major[this.major.length - 1], ...this.major.slice(0, -1)],
            [...this.major],
            [...this.major.slice(1), this.major[0]]
        ];

        this.load();
    }

    load(){
        // header date
        $("header .date").text(this.currentDate.toISOString().slice(0, 10));

        // 월별 입장 순서 캘린더
        $(".orderMonth .thead").html([
            `<div class="p-2 flex-1 fx-1 fw-bold text-center">#</div>`,
            ...this.dates.map(value=>`<div class="p-2 flex-1 fx-1 fw-bold text-center">${value}월</div>`)
        ])
        $(".orderMonth .tbody").html([
            `<div class="d-flex flex-column flex-1">
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold">1순위</div>
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold">2순위</div>
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold">3순위</div>
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold">4순위</div>
            </div>`,
            ...this.order.map(value=>`
                <div class="d-flex flex-column flex-1">
                    ${value.map(item=>`
                        <div class="p-2 flex-1 fx-n2 text-center">${item}</div>
                    `).join("")}
                </div>
            `)
        ])
    }
}