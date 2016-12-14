# canvas-writer
Wrapper for node-canvas to help with drawing text.

### Example
```js
const Canvas = require('canvas');
const CanvasWriter = require('canvas-writer');

let picture = new CanvasWriter(new Canvas(200, 200));

picture.write('Hello world! Text that will probably be wrapped onto the next lines because it\'s longer than that -> ', 80, {
    font: '16px "Segoe UI"',
    style: 'white'
});

console.log(picture.toString());
// Hello world! Text
// that will
// probably be
// wrapped onto
// the next lines
// because it's
// longer than that
// ->

picture.saveFile('./mypicture.png'); // You're done!
```

### Documentation
See the [Github wiki](https://github.com/1Computer1/canvas-writer/wiki) for documentation.  
(Currently too busy to write them. Just look at the documentation in the source code!)