'use strict';

const {promises:{readFile}} = require('fs');
class Handler {

  constructor({rekoSvc, translatorSvc}){
    this.rekoSvc = rekoSvc
    this.translatorSvc = translatorSvc
  }

  async detectImageLabels(buffer){
    const result = await this.rekoSvc.detectLabels({
      Image:{
        Bytes:buffer
      }
    }).promise();

   const workingItems = result.Labels
    .filter(({Confidence})=> Confidence > 80);

    const names = workingItems
      .map(({Name})=>Name)
      .join(' and ')
    
    return { names, workingItems }
  }

  async translateText(text){
    
    const params = {
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'pt',
      Text: text
    }

    const {TranslatedText} = await this.translatorSvc
                              .translateText(params)
                              .promise();

     
    return TranslatedText.split(' e ');
      
  }

  formatTextResults(texts, workingItems){

    const finalText = []

    for(const indexText in texts){
      const nameInPortuguese = texts[indexText]
      const confidence = workingItems[indexText].Confidence
      finalText.push(
        `${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`
      )
    }

    return finalText;

  }

  async main(event){
    try {
      
      const imgBuffer = await readFile('./imagens/cat.jpg');
      console.log('Detecting labels...');
      const { names, workingItems } = await this.detectImageLabels(imgBuffer);
      console.log('Translater to portuguese...');
      const translateText =  await this.translateText(names);
      console.log('Handling final object...');
      const finalText = this.formatTextResults(translateText, workingItems);
      console.log('Finishing...');
      
      return {
        statusCode:200,
        body:`A image tem \n `.concat(finalText)
      }
    } catch (error) {
      console.log('Error***', error.stack);
      
      return {
        statusCode: 500,
        body:'Internal server error!'
      }
    }
  }
}

const aws = require('aws-sdk');
const reko = new aws.Rekognition();
const translator = new aws.Translate();

const handler = new Handler({
  rekoSvc : reko,
  translatorSvc: translator
});


module.exports.main = handler.main.bind(handler)