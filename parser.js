var pause = 1; // пауза в секундах между проверкой каждого ресторана
var pathToSaveFile = 'C:\\text.txt'; // путь к файлу для сохранения
var startLink = 'https://www.tripadvisor.com/Restaurants-g255104-oa20-New_Zealand.html#LOCATION_LIST';



/*
* подключаем модуль для работы с файлами
*/
Components.utils.import("resource://gre/modules/FileUtils.jsm");

/*
* открываем файл, куда будем сохранять
* если файл не существует - создаем его
*/
var fileNode = imns.FIO.openNode(pathToSaveFile);
try {
    window.console.log(fileNode.lastModifiedTime);
} catch (err) {
    imns.FIO.writeTextFile(fileNode);
}

var countItemOnPage = 30;
var request = new Request();
var saveEmails = {};

iimPlayCode('URL GOTO=' + startLink);
while(true){
    var geoList = window.document.querySelectorAll('ul.geoList li a');
    for (var i = 0; i<geoList.length; i++) {
        var a = geoList[i];
        iimPlayCode('TAB OPEN \n TAB T=2');
        iimPlayCode('URL GOTO=' + a.href);
        parser();
        iimPlayCode('TAB CLOSE');
    }
    var spritePageNext = window.document.querySelector('.sprite-pageNext');
    if(spritePageNext){
        var oldFirstLink = geoList[0].href;
        spritePageNext.click();
         while(true){
                var firstLink =  window.document.querySelector('ul.geoList li a');;
                if(firstLink){
                    if(firstLink.href !== oldFirstLink){
                        break;
                    }
                }
                log('Ждем прогрузку страницы');
                iimPlayCode('WAIT SECONDS=1');
            }
    } else {
        log('Закончили')
        break;
    }
}

function parser(){
    var dataOffset = Number(getBody().querySelector('span.pageNum.current').getAttribute('data-offset'));
    for (;; dataOffset += countItemOnPage) {
        for (var indexListItem = dataOffset + 1; indexListItem < (dataOffset + countItemOnPage); indexListItem++) {
            // parse Restaurant Review
            var link = getBody().querySelector('div[data-test="' + indexListItem + '_list_item"] div>div>div>span a[href^="/Restaurant_Review-"]');

            if (link) {
            	log('Проверяем '+link.textContent);
                var html = request.get(link.href);
                var email = extractEmail(html);
                if (email) {
                    saveEmail(email);
                }
                iimPlayCode('WAIT SECONDS=' + pause);
            }
        }
        var nextButton = getBody().querySelector('div.pagination a.next')
        if (nextButton) {
            var nextPageButton = getBody().querySelector('a[data-offset="'+(dataOffset+countItemOnPage)+'"]');
            if(nextPageButton){
                iimPlayCode('URL GOTO=' + nextPageButton.href);
            } else {
                iimDisplay('Не смогли обнаружить ссылку на следующую страницу');
                iimPlayCode('PAUSE');
            }
        } else {
            log('Обошли все страницы');
            break;
        }
    }
}

function Request() {
    this.XMLHttpRequestConstructor = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1");
    this.XMLHttpRequest = new this.XMLHttpRequestConstructor;
    this.XMLHttpRequest.mozBackgroundRequest = true; //  чтобы не было окна авторизации прокси
    this.get = function(url, asynchronous = false) {
        var response = '';
        try{
            this.XMLHttpRequest.open("GET", url, asynchronous);
            this.XMLHttpRequest.send();
            response = this.XMLHttpRequest.responseText;
        } catch(err) {
            iimDisplay('Ошибка');
            window.console.error(err);
        }
        return response;
    }
}

function getBody() {
    return window.document.body;
}

function extractEmail(html) {
    if (/href="mailto:/.test(html)) {
        return html.split('href="mailto:')[1].split('?')[0];
    } else {
        return false;
    }
}

function saveEmail(email) {
	if(saveEmails.hasOwnProperty(email)){
		log('Уже сохраняли '+email);		
	} else {
    	saveEmails[email]=true;
        imns.FIO.appendTextFile(fileNode, email+'\r\n')
    	log('Сохранили '+email);
	}
}

function log(text) {
    iimDisplay(text);
}

function debug(text, value) {
    iimDisplay(text);
    window.console.log(value);
    iimPlayCode('PAUSE');
}
