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
        this.codeReader=new BrowserQRCodeReader();
        this.videoElement=document.querySelector("#video");

        this.devices=null;
        this.controls=null;
 
        this.students=[];
        this.student=null;

        this.key="1D0uBz9EtXE0oRVAJwzqLqydJ9SilufUm5VaTFlNeurY";
        this.gids=[
            0,
            2035791670,
            2082050942,
            1804786292,
            255651288,
            2074170014,
            1090760841,
            628116914,
            422824113,
            1584095104,
            1119392229,
            1682229772,
            612664774,
            1492243996,
            1467657593,
            1747357856,
            309441355,
            675103511,
            367313064,
            888019649,
            1595996718,
            1562465177,
            944095892,
            2031534596
        ];

        this.reader();
        this.init();
        this.event();
    }

    async reader(){
        this.devices=await BrowserQRCodeReader.listVideoInputDevices();
        if(!this.devices.length) return this.error();

        const common=this.devices.find(device=>device.label==="JOYTRON HD20 (145f:02aa)");
        this.cam=common ? common.deviceId : null;

        this.select();
        this.decoding();
        this.set();
    }

    select(){
        const selectElement=document.querySelector("#selectDevice select");
        const selectedDeviceId=this.cam;

        $(selectElement).html(
            this.devices.map(device =>
                `<option value="${device.deviceId}" ${device.deviceId===selectedDeviceId ? 'selected' : ''}>${device.label}</option>`
            )
        )

        $(selectElement).off("change").on("change", e=>{
            this.cam=e.target.value;
            this.decoding();
        });
    }

    decoding(){
        if(this.controls) this.controls.stop();

        const deviceId=this.cam;
        
        this.codeReader.decodeFromVideoDevice(deviceId, this.videoElement, (result, error, controls) => {
            this.controls=controls;
            if (result) {
                if(this.student) return;

                this.student=JSON.parse(result.getText());

                this.load();
            }
        });
    }

    set(){
        $("#selectDevice button").on("click", e=>$("#selectDevice").addClass("d-none"));

        $(document).on("keydown", e=>{
            if(e.ctrlKey && e.key==='q'){
                e.preventDefault();
                $("#selectDevice").toggleClass("d-none");
            }
        })
    }

    async init(){
        this.students=await Promise.all(
            this.gids.map((gid)=>fetch(`https://docs.google.com/spreadsheets/d/${this.key}/export?format=csv&gid=${gid}`).then(res=>res.text()))
        );

        this.students=this.students.reduce((acc, sheet)=>{
            let data=[...sheet.replaceAll(/\r/g, "").split("\n")].reduce((acc, value, index)=>{
                if(index===0) return acc;
    
                let datas=value.split(",");
                acc.push({
                    grade: datas[0],
                    class: datas[1],
                    number: datas[2],
                    name: datas[3],
                })
    
                return acc;
            }, []);

            return [...acc, ...data];
        }, []);
    }

    load(){
        setTimeout(()=>this.unload(), 1500);

        // values reset
        $($(".infoText")[0]).text("이름: ");
        $($(".infoText")[1]).text("학번: ");
        $($(".infoText")[2]).text("학과: ");
        $(".area").css("box-shadow", "0 0.5rem 1rem rgba(0, 0, 0, 0.15)");
        document.querySelector("#studentForm input").value="";
        if(!this.student) return; // invalid value
        // value not included in students
        if(!this.students.find(value=>`${value.grade}${value.class.padStart(2, '0')}${value.number.padStart(2, '0')}`===`${this.student.grade}${this.student.class.padStart(2, '0')}${this.student.number.padStart(2, '0')}`)){
            $(this.videoElement).css("border", "2px solid #f00");
            $(this.videoElement).css("box-shadow", "0 0 12px 4px rgba(255, 0, 0, 0.75)");
            setTimeout(()=>{
                $(this.videoElement).css("border", "none");
                $(this.videoElement).css("box-shadow", "0 1rem 3rem rgba(0, 0, 0, 0.175)");
            }, 1000)
            return;
        }

        // shadow
        const gradeColorMap={
            "1": "rgba(255, 94, 87, 0.4)",
            "2": "rgba(255, 179, 71, 0.5)",
            "3": "rgba(79, 195, 247, 0.5)"
        };
        const shadowColor=gradeColorMap[this.student.grade];
        if (shadowColor) $(".area").css("box-shadow", `0 0 1.5rem 1rem ${shadowColor}`);

        // text
        $($(".infoText")[0]).text(`이름: ${this.student.name}`);
        $($(".infoText")[1]).text(`학번: ${this.student.grade}${this.student.class.padStart(2, '0')}${this.student.number.padStart(2, '0')}`);

        let major=null;
        switch(Number(this.student.class)){
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
    
    unload(){
        this.QRdata=null;
        this.student=null;
        $(".area").css("box-shadow", "0 0.5rem 1rem rgba(0, 0, 0, 0.15)");
    }

    event(){
        // validation
        $("#studentForm input").on("input", e=>{
            e.target.value=e.target.value.trim().replaceAll(/[^\d]/g, ""); // only number
            if(e.target.value.length>5) e.target.value=e.target.value.slice(0, 5); // length 5 or less
            $("#studentForm input").removeClass("border-danger"); // error border reset
        })

        $("#studentForm").on("submit", e=>{
            e.preventDefault();
            if(this.student) return;

            const studentNumber=document.querySelector("#studentForm input").value;

            this.student=this.students.find(value=>`${value.grade}${value.class.padStart(2, '0')}${value.number.padStart(2, '0')}`===studentNumber);

            if(this.student) this.load();
            else{
                $("#studentForm .input-wrap").addClass("border border-danger border-2");
                setTimeout(()=>{
                    $("#studentForm .input-wrap").removeClass("border border-danger border-2")
                }, 1000)
            }
        })
    }

    error(){
        $("#alert").addClass("d-block");
        $("#alert").removeClass("d-none");
        
        $("#alert button").on("click", e=>{
            $("#alert").addClass("d-none");
            $("#alert").removeClass("d-block");
        })
    }
}

export class Input{
    load(){
        // validation init
        $($(".infoText")[0]).text("이름: ");
        $($(".infoText")[1]).text("학번: ");
        $($(".infoText")[2]).text("학과: ");
        $(".area").css("box-shadow", "0 0.5rem 1rem rgba(0, 0, 0, 0.15)");
        document.querySelector("#studentForm input").value="";
        if(!this.student) return;

        // shadow
        const gradeColorMap={
            "1": "rgba(255, 94, 87, 0.4)",
            "2": "rgba(255, 179, 71, 0.5)",
            "3": "rgba(79, 195, 247, 0.5)"
        };
        const shadowColor=gradeColorMap[this.student.grade];
        if (shadowColor) $(".area").css("box-shadow", `0 0 1.5rem 1rem ${shadowColor}`);

        // text
        $($(".infoText")[0]).text(`이름: ${this.student.name}`);
        $($(".infoText")[1]).text(`학번: ${this.student.grade}${this.student.class.padStart(2, '0')}${this.student.number.padStart(2, '0')}`);

        let major=null;
        switch(Number(this.student.class)){
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

export class Meal{
    constructor(){
        this.meal=[];
        this.startDate=null;
        this.currentDate=null;
        this.endDate=null;

        this.key="22425efd9eb84d97a51875483539b6ce";

        this.init();
    }

    async init(){
        // get current week
        this.currentDate=new Date();
        this.startDate=new Date(this.currentDate);
        this.startDate.setDate(this.currentDate.getDay()===1 ? this.currentDate.getDate()-3 : this.currentDate.getDate()-1);
        this.endDate=new Date(this.currentDate);
        this.endDate.setDate(this.currentDate.getDay()===5 ? this.currentDate.getDate()+3 : this.currentDate.getDate()+1);

        // 급식표 api
        this.meal=await Util.post("GET", `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${this.key}&ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530899&MLSV_FROM_YMD=${this.ISOString(this.startDate)}&MLSV_TO_YMD=${this.ISOString(this.endDate)}&Type=json`);
        if(this.meal.RESULT) return this.empty();
        
        this.meal=this.meal.mealServiceDietInfo[1].row;
        let tempMeal=[this.ISOString(this.startDate), this.ISOString(this.currentDate), this.ISOString(this.endDate)];
        
        this.meal=tempMeal.map(value=>({
            date: value,
            content: this.meal.find(item=>item.MLSV_YMD===value)
        }))
        
        this.load();
    }
    
    load(){
        let days=['월요일', '화요일', '수요일', '목요일', '금요일'];
        
        $(".lunchMenu thead tr").html(
            this.meal.map(value=>`
                <th scope="col" class="fx-2 fw-semibold text-center">${days[new Date(value.date.slice(0, 4), (value.date.slice(4, 6))-1, value.date.slice(6, 8)).getDay()-1]} <span class="fx-n1 text-secondary">(${parseInt(value.date.slice(4, 6))}.${parseInt(value.date.slice(6, 8))})</span></th>
            `)
        )

        $(".lunchMenu tbody tr").html(
            this.meal.map(value=>{
                if(value.content) return `<td class="fx-1 text-center lh-base overflow-hidden">${value.content.DDISH_NM.split("<br/>").map(value=>`
            <p class="mb-1 fx-1 text-center">${value.trim()}</p>
        `).join("")}</td>`;
                else return `<td class="fx-1 text-center lh-base overflow-hidden nowrap">(없음)</td>`;
            })
        )
        // console.log(this.meal[1].content.DDISH_NM.split("<br/>").map(value=>`
        //     <td class="fx-1 text-center lh-base overflow-hidden nowrap">${value.trim()}</td>
        // `).join(""))
    }

    empty(){
        let days=['월요일', '화요일', '수요일', '목요일', '금요일'];
        let dates=[this.ISOString(this.startDate), this.ISOString(this.currentDate), this.ISOString(this.endDate)];
        
        $(".lunchMenu thead tr").html(
            dates.map(value=>`
                <th scope="col" class="fx-1 fw-semibold text-center">${days[new Date(value.slice(0, 4), (value.slice(4, 6))-1, value.slice(6, 8)).getDay()-1]} <span class="fx-n2 text-secondary">(${parseInt(value.slice(4, 6))}.${parseInt(value.slice(6, 8))})</span></th>
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
        this.currentDate=new Date();
        this.dates=[this.currentDate.getMonth(), this.currentDate.getMonth()+1, this.currentDate.getMonth()+2];

        // majors (tbody)
        this.major=['전자과', '자동화과', '디자인과', '소프트과'];

        for(let i=3; i<this.currentDate.getMonth()+1; i++){
            this.major.push(this.major.shift());
        }

        this.order=[
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
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold nowrap">1.</div>
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold nowrap">2.</div>
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold nowrap">3.</div>
                <div class="p-2 flex-1 fx-n2 text-center fw-semibold nowrap">4.</div>
            </div>`,
            ...this.order.map(value=>`
                <div class="d-flex flex-column flex-1">
                    ${value.map(item=>`
                        <div class="p-2 flex-1 fx-n2 text-center nowrap">${item}</div>
                    `).join("")}
                </div>
            `)
        ])
    }
}