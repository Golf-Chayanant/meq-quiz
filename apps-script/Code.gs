/**
 * ตัวรับข้อมูลเบื้องหลังของเว็บแบบทดสอบ MEQ (กอล์ฟนอน 100)
 * - ติดตั้งใน Google Sheet เดิม: Extensions > Apps Script > วางไฟล์นี้
 * - รัน setup() 1 ครั้ง แล้ว Deploy > New deployment > Web app
 *   (Execute as: Me / Who has access: Anyone) → เอา URL /exec ไปใส่ใน config.js
 *
 * แท็บที่ใช้: WebResults (ทุกคนที่ทำจบ ไม่มีข้อมูลระบุตัวตน) / WebEmails (เฉพาะคนที่กรอกอีเมล)
 * Gmail ส่วนตัวส่งอีเมลผ่าน Apps Script ได้จำกัดต่อวัน → เกินโควต้าจะเก็บเป็น pending
 * แล้ว sendPending() ทยอยส่งทุกเช้าอัตโนมัติ
 */

var RESULT_SHEET = "WebResults";
var EMAIL_SHEET = "WebEmails";
var QUOTA_RESERVE = 5; // เหลือโควต้าไว้เผื่อใช้เอง
var PAGE_NAME = "กอล์ฟนอน 100";
var SITE_URL = "https://golf-chayanant.github.io/meq-quiz/";

/* TYPES: สร้างจาก content.js — ถ้าแก้เนื้อหาใน content.js ให้แก้ตรงนี้ให้ตรงกัน */
var GROUPS = /*GROUPS*/{"lark":{"name":"นกตื่นเช้า","en":"Morning Lark"},"middle":{"name":"นกกลางวัน","en":"Hummingbird"},"owl":{"name":"นกฮูก","en":"Night Owl"}};
var TYPES = /*TYPES*/[
 {
  "id": "lark-strong",
  "min": 70,
  "band": "70 คะแนนขึ้นไป",
  "group": "lark",
  "groupName": "นกตื่นเช้า",
  "en": "Definitely Morning",
  "name": "จอมทัพรุ่งอรุณ",
  "color": "#C2410C",
  "tint": "#FFF1E8",
  "tagline": "ในโลกที่หลายคนต้องสู้กับปุ่ม Snooze คุณคือคนที่ลืมตาขึ้นมาแล้วพร้อมลุยได้ทันที",
  "wake": "05:00 - 06:00",
  "bed": "21:00 - 22:00",
  "golden": "08:00 - 11:00",
  "day": [
   [
    "ช่วงเวลาทอง (งานยากที่สุด)",
    "08:00 - 11:00",
    "งานวิเคราะห์ งานที่ต้องคิดลึก อย่าเสียช่วงนี้ไปกับประชุมที่ไม่จำเป็น"
   ],
   [
    "ประสานงาน / งานทั่วไป",
    "11:00 - 13:00",
    "คุยงาน เจรจา งานเอกสาร มื้อเที่ยงเลี่ยงแป้งหนัก"
   ],
   [
    "ช่วงง่วงบ่าย",
    "13:00 - 15:00",
    "ถ้าง่วงจัด งีบก่อน 13:30 ไม่เกิน 20 นาที หรือลุกเดินรับแดด"
   ],
   [
    "ออกกำลังกาย",
    "16:00 - 18:00",
    "ช่วงที่ร่างกายพร้อมที่สุดของคุณ"
   ],
   [
    "เตรียมนอน",
    "19:00 - 21:00",
    "หรี่ไฟ งดจอ อาบน้ำอุ่น"
   ]
  ],
  "rules": [
   "งานยากที่สุดต้องจบก่อน 11:00",
   "หลัง 14:00 ไม่งีบ และตัดคาเฟอีน ใช้แสงแดดสู้ความง่วงแทน",
   "ยอมรับว่าร่างกายหมดแรงหลัง 21:00 อย่าฝืนเข้าสังคมจนเสียการนอน"
  ]
 },
 {
  "id": "lark",
  "min": 59,
  "band": "59 - 69 คะแนน",
  "group": "lark",
  "groupName": "นกตื่นเช้า",
  "en": "Moderately Morning",
  "name": "นกเช้าสายละมุน",
  "color": "#B45309",
  "tint": "#FFF7E6",
  "tagline": "คุณคือคนที่ใช้ชีวิตกับระบบการทำงานแบบมาตรฐานได้ดีที่สุด",
  "wake": "06:30 - 07:30",
  "bed": "22:30 - 23:30",
  "golden": "09:30 - 12:30",
  "day": [
   [
    "ตื่นแบบค่อยเป็นค่อยไป",
    "06:30 - 09:00",
    "รับแสงแดดทันที วางแผนวัน เช็กอีเมล"
   ],
   [
    "ช่วงเวลาทอง (งานยากที่สุด)",
    "09:30 - 12:30",
    "งานเขียน งานโปรแกรม แก้ปัญหาซับซ้อน เวลาที่แพงที่สุดของคุณ"
   ],
   [
    "ประชุม / ประสานงาน",
    "13:00 - 15:00",
    "ถ้าจะงีบ ช่วง 13:30 - 14:30 ไม่เกิน 20-30 นาที"
   ],
   [
    "ออกกำลังกาย",
    "16:00 - 18:30",
    "พลังสมองเริ่มลด แต่พลังกายพุ่งขึ้น"
   ],
   [
    "เตรียมนอน",
    "20:00 - 22:00",
    "อ่านหนังสือ ฟังเพลง ระวังแสงจากมือถือ"
   ]
  ],
  "rules": [
   "ดื่มกาแฟแก้วแรกหลังตื่นประมาณ 1.5 ชม.",
   "งานยากต้องจบก่อนเที่ยง",
   "ไม่งีบหลัง 15:00 และจบคาเฟอีนให้เร็ว เพื่อเก็บความง่วงไว้ใช้ตอนกลางคืน"
  ]
 },
 {
  "id": "middle",
  "min": 42,
  "band": "42 - 58 คะแนน",
  "group": "middle",
  "groupName": "นกกลางวัน",
  "en": "Intermediate",
  "name": "นกสายกลาง",
  "color": "#1D6FA5",
  "tint": "#EAF4FB",
  "tagline": "คุณปรับตัวเก่ง ยืดหยุ่นได้กับเกือบทุกตารางชีวิต",
  "wake": "07:00 - 08:30",
  "bed": "23:00 - 00:30",
  "golden": "10:00 - 13:00",
  "day": [
   [
    "เริ่มวันแบบสมดุล",
    "07:00 - 09:30",
    "รับแสงแดด ขยับร่างกายเบาๆ กาแฟแก้วแรกรอถึงราว 09:30"
   ],
   [
    "ช่วงเวลาทอง (งานยากที่สุด)",
    "10:00 - 13:00",
    "งานที่ต้องคิดต่อเนื่อง เขียนรายงาน วิเคราะห์ข้อมูล"
   ],
   [
    "ประชุม / งานประจำ",
    "13:00 - 15:00",
    "ระวังมื้อเที่ยงแป้งหนัก"
   ],
   [
    "ช่วงง่วงบ่าย",
    "15:00 - 16:30",
    "ถ้าจะงีบ ต้องจบก่อน 15:30 ไม่เกิน 20 นาที หรือเดินรับแดดแทนกาแฟแก้วที่สอง"
   ],
   [
    "ออกกำลังกาย",
    "17:00 - 19:30",
    "ช่วงที่ร่างกายพร้อมที่สุดของคุณ"
   ],
   [
    "เตรียมนอน",
    "21:00 - 23:00",
    "หรี่ไฟ อาบน้ำอุ่นก่อนนอน 1-2 ชม."
   ]
  ],
  "rules": [
   "วันหยุดอย่าตื่นสายกว่าวันทำงานเกิน 1 ชม.",
   "ง่วงบ่าย ให้ลุกขยับร่างกายแทนกาแฟแก้วที่สอง",
   "เลื่อนกาแฟแก้วแรกไปราว 09:30 - 10:00"
  ]
 },
 {
  "id": "owl",
  "min": 31,
  "band": "31 - 41 คะแนน",
  "group": "owl",
  "groupName": "นกฮูก",
  "en": "Moderately Evening",
  "name": "นกฮูกสายประนีประนอม",
  "color": "#6D28D9",
  "tint": "#F3EEFF",
  "tagline": "คุณไม่ได้ขี้เกียจ สมองคุณแค่ถูกออกแบบมาให้สปาร์คตอนที่คนอื่นเริ่มหมดแรง",
  "wake": "08:30 - 09:30",
  "bed": "00:30 - 01:30",
  "golden": "18:00 - 21:00",
  "day": [
   [
    "ช่วงสมองยังไม่ตื่น",
    "08:30 - 10:30",
    "รับแสงแดดทันที ทำงานง่ายๆ ก่อน กาแฟเลื่อนไปราว 11 โมง"
   ],
   [
    "คุยงาน / ทำงานกับคนอื่น",
    "11:00 - 14:00",
    "เริ่มคุยรู้เรื่องแล้ว เคลียร์งานส่วนรวมช่วงนี้"
   ],
   [
    "ช่วงไอเดียมา",
    "15:00 - 17:00",
    "งานสร้างสรรค์ ระดมสมอง คาเฟอีนแก้วสุดท้ายจบก่อน 15:00"
   ],
   [
    "ช่วงเวลาทอง (งานยากที่สุด)",
    "18:00 - 21:00",
    "งานยากที่สุดของวัน ตอนที่คนอื่นเริ่มหมดไฟ"
   ],
   [
    "ออกกำลังกาย",
    "19:00 - 20:30",
    "จบก่อน 21:00 ให้ร่างกายเย็นลงทันเวลานอน"
   ],
   [
    "เตรียมนอน",
    "22:00 - 00:00",
    "หรี่ไฟให้มืดที่สุด อาบน้ำอุ่น"
   ]
  ],
  "rules": [
   "อย่าฝืนทำงานยากตอนเช้าที่สมองยังไม่ตื่น",
   "ปกป้องช่วง 18:00 - 21:00 ไว้ทำงานสำคัญ",
   "งดแสงจากจอก่อนนอน เพราะจะยิ่งดันเวลานอนให้ดึกขึ้น"
  ]
 },
 {
  "id": "owl-strong",
  "min": 0,
  "band": "30 คะแนนลงมา",
  "group": "owl",
  "groupName": "นกฮูก",
  "en": "Definitely Evening",
  "name": "นกฮูกตัวจริง",
  "color": "#312E81",
  "tint": "#EEF0FA",
  "tagline": "ตอนที่โลกทั้งใบหลับใหล คือตอนที่สมองคุณทรงพลังที่สุด",
  "wake": "10:00 - 11:00",
  "bed": "02:00 - 03:00",
  "golden": "21:00 - 00:00",
  "day": [
   [
    "ช่วงสมองยังไม่ตื่น",
    "10:00 - 12:00",
    "รับแสงแดดทันที อย่าเพิ่งรีบดื่มกาแฟ"
   ],
   [
    "พบปะผู้คน / งานประจำ",
    "12:00 - 15:00",
    "ออกไปรับแสงแดดให้มากที่สุด ช่วยไม่ให้นาฬิกาชีวิตเลื่อนดึกไปอีก"
   ],
   [
    "ออกกำลังกาย",
    "16:00 - 19:00",
    "พลังกายและอารมณ์ดีที่สุด มื้อเย็นจบก่อน 20:00"
   ],
   [
    "ช่วงเวลาทอง (งานยากที่สุด)",
    "21:00 - 00:00",
    "งานวิเคราะห์ งานสร้างสรรค์ที่ต้องใช้สมาธิ"
   ],
   [
    "เตรียมนอน",
    "00:30 - 01:30",
    "ปิดไฟเกือบมืด งดจอ อาบน้ำอุ่น"
   ]
  ],
  "rules": [
   "แสงแดดตอนตื่นคือยา ช่วยไม่ให้เวลานอนเลื่อนดึกขึ้นเรื่อยๆ",
   "อย่าเสียใจที่ทำงานเช้าไม่ได้เรื่อง เก็บงานยากไว้หลัง 2 ทุ่ม",
   "ห้องนอนเย็นและมืด ช่วยรักษาการนอนช่วงเช้ามืด"
  ]
 }
];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, RESULT_SHEET, ["Timestamp", "Score", "Type", "Answers (ตัวเลือกที่ 1-n ของข้อ 1-19)", "Source"]);
  ensureSheet_(ss, EMAIL_SHEET, ["Timestamp", "Email", "Consent (รับข่าวสาร)", "Score", "Type", "Status", "Sent at"]);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendPending") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendPending").timeBased().everyDays(1).atHour(8).create();
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = JSON.parse(e.postData.contents);
    var type = findType_(data.type);
    var score = Number(data.score);
    if (!type || !(score >= 0 && score <= 100)) return json_({ ok: false });
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.kind === "result") {
      var answers = Array.isArray(data.answers) ? data.answers.slice(0, 19).join(",") : "";
      ss.getSheetByName(RESULT_SHEET).appendRow([new Date(), score, type.id, answers, String(data.src || "").slice(0, 60)]);
      return json_({ ok: true });
    }

    if (data.kind === "email") {
      var email = String(data.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return json_({ ok: false });
      // กันส่งซ้ำอีเมลเดิมภายใน 6 ชม.
      var cache = CacheService.getScriptCache();
      if (cache.get("m:" + email)) return json_({ ok: true });
      cache.put("m:" + email, "1", 21600);

      var sh = ss.getSheetByName(EMAIL_SHEET);
      sh.appendRow([new Date(), email, data.consent === true ? "yes" : "no", score, type.id, "pending", ""]);
      var row = sh.getLastRow();
      if (MailApp.getRemainingDailyQuota() > QUOTA_RESERVE) {
        sendResultEmail_(email, score, type);
        sh.getRange(row, 6, 1, 2).setValues([["sent", new Date()]]);
      }
      return json_({ ok: true });
    }
    return json_({ ok: false });
  } catch (err) {
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

/** ทยอยส่งอีเมลที่ค้าง (trigger ทุกเช้า) */
function sendPending() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EMAIL_SHEET);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][5] !== "pending") continue;
    if (MailApp.getRemainingDailyQuota() <= QUOTA_RESERVE) break;
    var type = findType_(values[i][4]);
    if (!type) continue;
    sendResultEmail_(values[i][1], values[i][3], type);
    sh.getRange(i + 1, 6, 1, 2).setValues([["sent", new Date()]]);
  }
}

function findType_(id) {
  for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
  return null;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sendResultEmail_(email, score, t) {
  var g = GROUPS[t.group];
  var day = t.day.map(function (d) {
    var gold = d[0].indexOf("ช่วงเวลาทอง") === 0;
    return '<tr><td style="padding:12px 14px;border-radius:12px;background:' + (gold ? t.tint : "#f7f7f7") + ';' + (gold ? "border:2px solid " + t.color + ";" : "") + '">' +
      '<div style="font-size:13px;font-weight:bold;color:' + t.color + ';">' + esc_(d[1]) + ' น.</div>' +
      '<div style="font-size:16px;font-weight:bold;color:#1f2328;">' + esc_(d[0]) + '</div>' +
      '<div style="font-size:14px;color:#5f6670;">' + esc_(d[2]) + '</div></td></tr><tr><td style="height:8px"></td></tr>';
  }).join("");
  var rules = t.rules.map(function (r, i) {
    return '<li style="margin-bottom:8px;">' + esc_(r) + '</li>';
  }).join("");

  var html =
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">' +
      '<div style="background:' + t.color + ';color:#fff;text-align:center;padding:28px 20px;">' +
        '<div style="font-size:15px;opacity:.9;">คุณคือ ' + esc_(g.name) + '</div>' +
        '<div style="font-size:30px;font-weight:bold;margin:4px 0;">' + esc_(t.name) + '</div>' +
        '<div style="font-size:14px;opacity:.85;">' + esc_(t.en) + ' · คะแนน ' + esc_(score) + ' (ช่วง ' + esc_(t.band) + ')</div>' +
      '</div>' +
      '<div style="padding:24px 20px;color:#1f2328;line-height:1.6;">' +
        '<p style="font-size:17px;text-align:center;margin:0 0 18px;">' + esc_(t.tagline) + '</p>' +
        '<table width="100%" style="border-collapse:separate;border-spacing:8px 0;margin-bottom:12px;"><tr>' +
          '<td style="background:' + t.tint + ';border-radius:12px;padding:10px;text-align:center;"><div style="font-size:13px;color:#5f6670;">เวลาตื่นที่ใช่</div><b>' + esc_(t.wake) + '</b></td>' +
          '<td style="background:' + t.tint + ';border-radius:12px;padding:10px;text-align:center;"><div style="font-size:13px;color:#5f6670;">เวลานอนที่ใช่</div><b>' + esc_(t.bed) + '</b></td>' +
        '</tr></table>' +
        '<div style="border:2px dashed ' + t.color + ';border-radius:14px;padding:14px;text-align:center;margin-bottom:22px;">' +
          '<div style="font-size:13px;color:#5f6670;">ช่วงเวลาทองของคุณ</div>' +
          '<div style="font-size:26px;font-weight:bold;color:' + t.color + ';">' + esc_(t.golden) + ' น.</div>' +
          '<div style="font-size:14px;color:#5f6670;">เก็บงานที่ยากที่สุดของวันไว้ช่วงนี้</div></div>' +
        '<h3 style="font-size:18px;margin:0 0 10px;">วันที่ใช่ของคุณ</h3>' +
        '<table width="100%" style="border-collapse:collapse;">' + day + '</table>' +
        '<h3 style="font-size:18px;margin:18px 0 10px;">3 กฎของคุณ</h3>' +
        '<ol style="padding-left:20px;margin:0;">' + rules + '</ol>' +
        '<p style="font-size:14px;color:#5f6670;margin-top:24px;">ชวนคนรอบตัวมาลองทำได้ที่ <a href="' + SITE_URL + '" style="color:' + t.color + ';">' + SITE_URL + '</a></p>' +
      '</div>' +
      '<div style="background:#f6f6f6;padding:14px;text-align:center;font-size:12px;color:#999;line-height:1.6;">' +
        'ผลนี้เป็นแนวทางทำความรู้จักตัวเอง ไม่ใช่การวินิจฉัยทางการแพทย์<br>' +
        'MEQ: Horne &amp; Östberg (1976) · แปลไทยโดย ' + PAGE_NAME + '<br>' +
        'ไม่ต้องการรับอีเมลอีก หรืออยากให้ลบข้อมูล ตอบกลับอีเมลนี้ได้เลย' +
      '</div></div>';

  MailApp.sendEmail({
    to: email,
    subject: PAGE_NAME + " : ผลแบบทดสอบ MEQ ของคุณ — " + t.name,
    htmlBody: html,
    name: PAGE_NAME,
  });
}
