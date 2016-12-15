const Canvas = require('canvas');
const Image = Canvas.Image;
const fs = require('fs');

class CanvasWriter {
    /**
     * Creates a CanvasWriter.
     * @param {Canvas} canvas Canvas to use.
     */
    constructor(canvas){
        /** Canvas of the CanvasWriter. */
        this.canvas = canvas;

        /** CanvasRenderingContext2D of the Canvas. */
        this.ctx = canvas.getContext('2d');
        this.ctx.save();

        /** The current y coord to write text on. */
        this.line = 0;

        /** Text that has been written on the Canvas and the options used for them. */
        this.texts = [];
    }

    /** The previous write operation on this CanvasWriter. */
    get lastWrite(){
        return this.texts.slice(-1)[0];
    }

    /** The current line count. */
    get lineCount(){
        return this.texts.length;
    }

    /**
     * Draws a background.
     * @param {string|object} style Style to fill with. Can be a color, gradient, etc.
     * @return This CanvasWriter.
     */
    drawBackground(style){
        this.ctx.save();

        this.ctx.fillStyle = style;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
        return this;
    }

    /**
     * Draws a background image.
     * @param {Buffer} buffer A buffer.
     * @return This CanvasWriter.
     */
    drawBackgroundImage(buffer){
        let image = new Image();
        image.src = buffer;
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);

        return this;
    }

    /**
     * Writes a line of text.
     * @param {string} text Text to write.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    writeText(text, options = {}, strokeOptions = {}){
        this.ctx.save();

        let maxLines = options.maxLines || 0;
        if (this.lineCount >= maxLines && maxLines > 0) return this;

        let offsetX = options.x || 5;
        let offsetY = options.y || 5;
        let spacing = options.spacing || 0;
        if (this.line === 0) spacing = 0;

        this.ctx.font = options.font || '16px serif';
        this.ctx.fillStyle = options.style || 'white';
        this.ctx.textAlign = options.align || 'start';

        this.ctx.shadowColor = options.shadowColor;
        this.ctx.shadowOffsetX = options.shadowX || 0;
        this.ctx.shadowOffsetY = options.shadowY || 0;
        this.ctx.shadowBlur = options.shadowBlur || 0;

        this.ctx.strokeStyle =  strokeOptions.style;
        this.ctx.lineWidth = strokeOptions.width;
        this.ctx.lineJoin = strokeOptions.join;

        let measure = this.ctx.measureText(text);

        if (strokeOptions.style || strokeOptions.width || strokeOptions.join){
            let xSpace = (this.ctx.textAlign === 'center' ? 0 : measure.actualBoundingBoxLeft + this.ctx.lineWidth) + offsetX;
            let ySpace = this.line + measure.actualBoundingBoxAscent + this.ctx.lineWidth + spacing + offsetY;

            this.texts.push({text, xSpace, ySpace, options, strokeOptions});

            this.ctx.strokeText(text, xSpace, ySpace);
            this.ctx.fillText(text, xSpace, ySpace);
            this.line += measure.actualBoundingBoxAscent + measure.emHeightDescent + this.ctx.lineWidth + spacing;

            return this;
        }

        let xSpace = (this.ctx.textAlign === 'center' ? 0 : measure.actualBoundingBoxLeft) + offsetX;
        let ySpace = this.line + measure.actualBoundingBoxAscent + spacing + offsetY;

        this.texts.push({text, xSpace, ySpace, options, strokeOptions});

        this.ctx.fillText(text, xSpace, ySpace);
        this.line += measure.actualBoundingBoxAscent + measure.emHeightDescent + spacing;

        this.ctx.restore();
        return this;
    }

    /**
     * Writes multiple lines of text.
     * @param {string|Array} lines Lines to write, either in an array or separated by newlines.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    writeLines(lines, options = {}, strokeOptions = {}){
        let texts = lines;
        if (typeof texts === 'string') texts = texts.split('\n');

        texts.forEach(t => this.writeText(t, options, strokeOptions));
        return this;
    }

    /**
     * Writes and wraps a line of text.
     * @param {string|Array} text Text to write.
     * @param {number} maxWidth Maximum text width.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    writeWrapped(text, maxWidth = this.canvas.width, options = {}, strokeOptions = {}){
        this.ctx.font = options.font || '16px serif';
        let results = [];

        let reduceToFit = (text) => {
            let width = this.ctx.measureText(text).width;

            if (width > maxWidth){
                let section = text;
                let j = 1;

                while (this.ctx.measureText(section).width > maxWidth && section.length > 1){
                    section = section.slice(0, -1);
                    j += 1;
                }

                results.push(section);
                return reduceToFit(text.slice(-j + 1));
            }

            results.push(text);
        };

        reduceToFit(text);
        this.writeLines(results, options, strokeOptions);
        return this;
    }

    /**
     * Writes and wraps multiple lines of text.
     * @param {string|Array} lines Lines to write, either in an array or separated by newlines.
     * @param {number} maxWidth Maximum text width.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    writeWrappedLines(lines, maxWidth = this.canvas.width, options = {}, strokeOptions = {}){
        let texts = lines;
        if (typeof texts === 'string') texts = texts.split('\n');

        texts.forEach(t => this.writeWrapped(t, maxWidth, options, strokeOptions));
        return this;
    }

    /**
     * Writes and wraps a line of text by whitespace.
     * @param {string|Array} text Text to write.
     * @param {number} maxWidth Maximum text width.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    writeWordWrapped(text, maxWidth = this.canvas.width, options = {}, strokeOptions = {}){
        this.ctx.font = options.font || '16px serif';
        let results = [];

        let reduceToFit = (text) => {
            let width = this.ctx.measureText(text).width;

            if (width > maxWidth){
                let section = text;
                let j = 1;

                while (this.ctx.measureText(section).width > maxWidth && section.length > 1){
                    section = section.slice(0, -1);
                    j += 1;
                }

                results.push(section);
                return text.slice(-j + 1);
            }

            return text;
        };

        let splitToFit = (text) => {
            if (!text) return;

            let words = text.split(' ');
            let width = this.ctx.measureText(words.join(' ')).width;

            if (width > maxWidth){
                let section = words;
                let remainder = [];

                while (this.ctx.measureText(section.join(' ')).width > maxWidth && section.join(' ').length > 1){
                    if (section.length === 1){
                        let extra = reduceToFit(section.join(' '));
                        return splitToFit(extra + ' ' + remainder.join(' '));
                    }

                    remainder.splice(0, 0, section.pop());
                }

                results.push(section.join(' '));
                return splitToFit(remainder.join(' '));
            }

            results.push(text);
        };

        splitToFit(text);
        this.writeLines(results, options, strokeOptions);
        return this;
    }

    /**
     * Writes and wraps multiple lines of text by whitespace.
     * @param {string|Array} lines Lines to write, either in an array or separated by newlines.
     * @param {number} maxWidth Maximum text width.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    writeWordWrappedLines(lines, maxWidth = this.canvas.width, options = {}, strokeOptions = {}){
        let texts = lines;
        if (typeof texts === 'string') texts = texts.split('\n');

        texts.forEach(t => this.writeWordWrapped(t, maxWidth, options, strokeOptions));
        return this;
    }

    /**
     * Shortcut to writeWordWrappedLines().
     * @param {string|Array} lines Lines to write, either in an array or separated by newlines.
     * @param {number} maxWidth Maximum text width.
     * @param {WriteOptions} options Options for the drawing of the text.
     * @param {StrokeOptions} strokeOptions Options for the stroke of the text.
     * @return This CanvasWriter.
     */
    write(lines, maxWidth = this.canvas.width, options = {}, strokeOptions = {}){
        return this.writeWordWrappedLines(lines, maxWidth, options, strokeOptions);
    }

    /**
     * Checks if the text fits on the Canvas vertically.
     * Not always reliable due to differences in fonts.
     * @return Whether or not it fits.
     */
    isFitting(){
        return this.line < this.canvas.height;
    }

    /**
     * Clones the text drawn on the given CanvasWriter to this one.
     * @param {CanvasWriter} CanvasWriter CanvasWriter to clone from.
     * @param {number} limit How many lines to clone.
     * @return This CanvasWriter.
     */
    cloneFrom(CanvasWriter, limit = CanvasWriter.texts.length){
        let toClone = CanvasWriter.texts.slice(0, limit);

        toClone.forEach(t => {
            this.writeText(t.text, t.options, t.strokeOptions, t.shadowOptions);
        });

        return this;
    }

    /**
     * Gets the DataURL of the image.
     * @param {string} type Type of image.
     * @param {object} options Image options.
     * @return A Promise with the DataURL.
     */
    dataURL(type = 'image/png', options = {}){
        return new Promise((resolve, reject) => {
            this.canvas.toDataURL(type, options, (err, url) => {
                if (err) return reject(err);
                resolve(url);
            });
        });
    }

    /**
     * Gets the Buffer of the image.
     * @return A Promise with the Buffer.
     */
    buffer(){
        return new Promise((resolve, reject) => {
            this.canvas.toBuffer((err, buffer) => {
                if (err) return reject(err);
                resolve(buffer);
            });
        });
    }

    /**
     * Saves the Canvas as a file.
     * @param {string} path Path to save to.
     * @param {object} options Options for fs.writeFile().
     * @return A Promise with error or path.
     */
    saveFile(path, options){
        return new Promise((resolve, reject) => {
            this.buffer().then(buffer => {
                fs.writeFile(path, buffer, options, err => {
                    if (err) reject(err);
                    resolve(path);
                });
            });
        });
    }

    /**
     * toString() overwrite.
     * @return The text written on this CanvasWriter.
     */
    toString(){
        return this.texts.map(t => t.text).join('\n');
    }
}

module.exports = CanvasWriter;