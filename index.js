// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getDatabase, ref, push ,onValue, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-database.js"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
   
// Your web app's Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyDddQ43RvrUFhhmmIocDQe2qiLcHyXOEeQ",
authDomain: "ws-server-3f08d.firebaseapp.com",
databaseURL: "https://ws-server-3f08d-default-rtdb.firebaseio.com",
projectId: "ws-server-3f08d",
storageBucket: "ws-server-3f08d.appspot.com",
messagingSenderId: "1019760919499",
appId: "1:1019760919499:web:0ec7e98067e9abe5796c4e"
};
   
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let fbRecordRef = ref(db,'ranking/timeAttack');
let btnElement; 
let originalWordList;
let wordList;
let mode = -1;
let currentWordArray;
let score;
let falseCount;
let matigaiLimit = 3;
window.onload = () => {
    btnElement = document.querySelector("#start");
    btnElement.value = "単語リストを読み込み中、お待ちください";
    btnElement.disabled = true;
    const descriptionArea = document.querySelector(".description");
    //時間無制限モード
    document.settings.set_radio[0].addEventListener('change',()=>{
        mode = 0;
        descriptionArea.textContent = "時間制限はありませんが、合計" + matigaiLimit + "回間違えるとアウトになります。間違えずにどれだけスコアを稼げるかを競います。スコアは1問10ポイントです。";

    });
    //タイムアタックモード
    document.settings.set_radio[1].addEventListener('change',()=>{
        mode = 1;
        descriptionArea.textContent = "2分の時間制限があります。2分以内にどれだけスコアを稼げるかを競います。スコアは1問10ポイントです。"
    });
    //単語リストの取得
    fetch("./words.json").then((data)=>data.json()).then(
        (result)=>{
            originalWordList = result;
            btnElement.value = "ゲームを開始する"
            btnElement.disabled = false;
            initGame();
        }
        ).catch(()=>{
            btnElement.value = "単語リスト取得エラーです。開始できません"
        });
        btnElement.addEventListener('click',startGame);

        //firebase関連のイベント設定
        //スコアの大きい順に取得
        const q = query(fbRecordRef,orderByChild("score"));
        const disconnect = onValue(q, function(snapshot) {
        let rankValue = snapshot.val();
        if(rankValue != null){
        //firebaseからデータを取得し表を作成する
        Object.keys(rankValue).map((key,idx)=>{
            if(idx < 10){
            let td = document.createElement("tr");
            td.innerHTML = "<td>" + rankValue[key].username + "</td><td>" + rankValue[key].score + "</td>";
            document.getElementById("ranking").appendChild(td);
            }
        });
    }
    }, 
    function(errorObject) {
        alert("failed: " + errorObject.code);
    });
};
let initGame = ()=>{//ゲーム初期化
    score = 0;
    falseCount = 0;
    hideCountdown();
    document.querySelector(".menu").classList.remove("hidden");
    wordList = shuffle(originalWordList);
}
let startGame = async ()=>{
    falseCount = 0;
    if(mode == 0){//間違える回数で
        document.querySelector(".nokori").textContent = matigaiLimit + "回";
    }else if(mode == 1){//タイムアタック
        document.querySelector(".nokori").textContent = "2:00";
    }else{
        alert("ゲームの進行方法を選択してください");
        return;
    }
    showCountdown();
    //ゲーム前のカウントダウン
    await countdown(5000,(ms,count)=>{document.querySelector(".countdown").textContent = (ms/1000)-count;});
    if(mode == 1){//タイムアタックモード時用のタイマーをセット
        countdown(120000,
           (ms,count)=>{
            const leftSecond = (ms/1000) - count;
            let sec = (leftSecond % 60).toString();
            if(sec.length < 2) sec = "0" + sec;//ゼロ埋め
            const minute = Math.floor(leftSecond / 60);
            document.querySelector(".nokori").textContent = minute + ":" + sec;
            }).then(()=>{
                endGame();
            });
    }
    document.querySelector(".menu").classList.add("hidden");
    mainLoop();
}
let mainLoop = () =>{
    //ゲームのメインループ
    //配列から単語をランダムで選び、文字の並び順をシャッフルする機能をここに書く。
    //選ぶ単語の数だけ繰り返す
    //3回間違えたらその地点で終了とする
    if(wordList.length == 0){
        alert("おめでとうございます。あなたは全ての問題をクリアしました。ゲームを終了します。");
        mainLoop();
        return;
    }
    //ランダムで１単語選定
    let rand = Math.floor(Math.random() * (wordList.length - 1));
    //単語を一つ取り出す
    let currentWord = wordList[rand];
    //当該単語を問題リストから消去
    wordList.splice(rand,1);
    //配列に変換
    currentWordArray = [...currentWord];
    let currentQuestionString = shuffle(currentWordArray).join("");
    document.getElementById("questonWordBig").textContent = currentQuestionString;
    document.querySelector("#ok").addEventListener("click",checkAnswer);
}
let checkAnswer = ()=>{
    let isFalse = false;//間違いがあったかの判定用
    const inputElement = document.getElementById("word");
    const userInput = inputElement.value;
    inputElement.value = "";
    const userInputArray = [...userInput];
    if(userInputArray.length == 0){alert("文字を入力してください");return;}
    //間違え箇所のマーキング追加処理
    const marked = userInputArray.map((character,index)=>{
        if(character == currentWordArray[index]){
            return "<span class='true'>" + character + "</span>";
        }else{
            isFalse = true;
            return "<span class='false'>" + character + "</span>";
        }
    });
    if(isFalse){//間違いがあった場合の処理
        document.querySelector(".hint").innerHTML = marked.join("");
        falseCount++;
        if(mode == 0){
            document.querySelector(".nokori").textContent =  falseCount + "回 / " + matigaiLimit + "回";
            if(falseCount > matigaiLimit) endGame();
        }
    }else{
        document.querySelector(".hint").innerHTML = "";
        score = score + 10;
        document.getElementById("score").textContent = score;
        mainLoop();
    }
}
let endGame = async()=>{
        document.querySelector(".hint").innerHTML = "";
        if(mode == 1){
            //firebaseへの記録処理
            let userName = prompt("あなたのスコアは" + score + "でした。\nランキングへの記録処理を行います。ユーザ名を入力してください。");
            await push(fbRecordRef,{"username" : userName, "score" : score});
        }else{
            alert("ゲームオーバー。あなたのスコアは" + score + "でした");
        }
        initGame();
}
//シャッフルアルゴリズム
let shuffle = (arr)=>{
    const arr2 = [...arr];
    let n = arr2.length;
    for(let i = n-1;i>0;i--){
        let j = Math.floor(Math.random() * i);
        let tmp = arr2[i];
        arr2[i] = arr2[j];
        arr2[j] = tmp;
    }
    return arr2;
}
let countdown = async (ms,callback)=>{
    //カウントダウン
    for(let i=0;i<ms/1000;i++){
        callback(ms,i);
        await new Promise((resolve)=>{setTimeout(resolve,1000)});
    }
}
let showCountdown = () =>{
    document.querySelector(".option-area").style.visibility = "hidden";
    document.querySelector(".countdown").style.visibility = "visible";
}
let hideCountdown = () =>{
    document.querySelector(".option-area").style.visibility = "visible";
    document.querySelector(".countdown").style.visibility = "hidden";
}