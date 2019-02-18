<!DOCTYPE html>
<html>
  <head>
    <title>Image Unhide - CS580W</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body bgcolor = "ghostwhite">
  {{}}
    <div>
    {{^msg}}
    {{^revealed}}
      <h3><font color = "B77612" face = "arial">List of available images: </font></h3>
    {{/revealed}}
    {{/msg}}
    {{#revealed}}
      <h3><font color = "B77612" face = "arial">Unhide Success! Your message is:</h3> <p><h4><em>{{revealed}}</em></font></h4></p>
    {{/revealed}}
      <p class="error"><h3><font color = "#ec1200" face = "arial">{{msg}}</font></h3></p>
    </div>
    <form action = "/unhide.html"  method = "POST">
    <div class = "parentImgDiv">
      {{#images}}
        <div class = "imgDiv">
          <a href="{{imageUrl}}/images/{{steg}}/{{value}}.png"><img class="container img" src="{{imageUrl}}/images/{{steg}}/{{value}}.png"/></a><br>
          <p class = "pCenter"><em>{{value}}.png</em><br>
          <input type = "radio" name = "imgSelect", margin-left: 60px; value = {{value}} {{#selected}}checked{{/selected}}>
        </div>
      {{/images}}
  
      {{#showForm}} 
      </div>
      <div class = "inputDiv">
      <p class = "pCenter"><input type="submit" value="Unhide" class = "submit"></p>
      </div>
    </form>
    <p>*Please select an image to continue</p>
    <ul><li><em> Note: To view full size, click on the image</em></li></ul>
    {{/showForm}}
    <hr>
    {{>footer}}
  </body>
</html>
