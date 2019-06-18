import Person from '../data/person';
import store from '../../store/store';
import Positionable from './positionable';
import Point from './point';

// Represents a person in the family tree
export default class TreeNode extends  Positionable {

    // Person rectangle defaults
    public static WIDTH = 130;
    public static HEIGHT = 140;
    public static RECT_STROKE_STYLE = '#2e6f9a';
    public static RECT_LINE_WIDTH = 2;
    public static SELECTED_RECT_LINE_WIDTH = 6;
    public static RECT_ROUNDED_CORNER_RADIUS = 15;
    public static LEFT_MARGIN = 25;
    public static RECT_FILL_STYLE = '#FFFAFA';
    public static SELECTED_RECT_FILL_STYLE = 'rgb(150, 222, 152)';
    public static HIGHLIGHTED_RECT_FILL_STYLE = 'rgb(200, 172, 232)';
    public static MIN_SPACING = 30;
    public static MORE_ARROW_SPACING = 5;
    public static MORE_ARROW_HEIGHT = 15;
    public static MORE_ARROW_WIDTH = 10;

    // Image Defaults
    public static TOP_IMAGE_MARGIN = 10;

    // Text Defaults
    public static TOP_TEXT_MARGIN = 115;
    public static LEFT_TEXT_MARGIN = 10;
    public static FONT_SIZE = 12;

    public readonly id: string;

    public readonly person: Person;
    public imagePath: string;
    public ancestors: TreeNode[];
    public descendants: TreeNode[];
    public partners: TreeNode[];
    public addToTree: boolean;
    public selected: boolean;
    public wrappedName: string[];
    public photo: any;
    public spacing: number;
    public highlighted: boolean;
    private readonly ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D, person: Person) {
        super(TreeNode.WIDTH, TreeNode.HEIGHT);
        this.ctx = ctx;

        this.person = person;
        this.id = person.id;

        this.imagePath = person.small_thumbnail;
        if (!person.small_thumbnail) {
            this.imagePath = 'img/portrait_80.png';
        }

        this.ancestors = new Array<TreeNode>();
        this.descendants = new Array<TreeNode>();
        this.partners = new Array<TreeNode>();

        this.addToTree = false;
        this.selected  = person.id === store.state.person_id;
        this.wrappedName = this.wrapName(person.name);
        this.photo = null;
        this.spacing = TreeNode.MIN_SPACING;
        this.highlighted = false;
    }


    public render() {

        // window.console.log(`TreeNode: ${this.id} Render()`);
        // window.console.log(`x:${this.x} y:${this.y}`);

        if (!this.hasXValue || !this.hasYValue) {
            return;
        }

        this.roundRect();

        this.ctx.fillStyle = '#000';
        this.ctx.font = `${TreeNode.FONT_SIZE}px Arial`;
        this.ctx.textBaseline = 'bottom';

        const left = this.x + TreeNode.LEFT_TEXT_MARGIN;
        const top = this.y + TreeNode.TOP_TEXT_MARGIN;
        for (let i = 0; i < this.wrappedName.length; i++ ) {
            this.ctx.fillText(this.wrappedName[i], left, top + (TreeNode.FONT_SIZE + 5) * i );
        }

        // Dev only
        // this.ctx.fillText(`id:${this.id}`, left, top + (TreeNode.FONT_SIZE + 5) * (this.wrappedName.length + 1));
        // this.ctx.fillText(`x:${this.x}`, left, top + (TreeNode.FONT_SIZE + 5) * (this.wrappedName.length + 2));

        if (this.photo) {
            this.ctx.drawImage(this.photo, this.x + TreeNode.LEFT_MARGIN, this.y + TreeNode.TOP_IMAGE_MARGIN);
        } else {
            this.photo = new Image();
            this.photo.src = this.imagePath;

            // Have to wait for photo to load before drawing it
            this.photo.onload = () => {
                this.ctx.drawImage(this.photo, this.x + TreeNode.LEFT_MARGIN, this.y + TreeNode.TOP_IMAGE_MARGIN);
            };
        }

        // Any relations not show
        if (this.descendants.some((x) => !x.addToTree)
            || this.partners.some((x) => !x.addToTree)
            || this.ancestors.some((x) => !x.addToTree)) {
            this.drawArrow();
        }

        this.ctx.save();
    }

    public clearRenderValues() {

        if (!this.selected) {
            this.clearPosition();
        }

        this.spacing = TreeNode.MIN_SPACING;
        this.addToTree = false;
    }

    private wrapName(name: string): string[] {

        const wrappedName = new Array<string>();

        const maxWidth = TreeNode.WIDTH - (2 * TreeNode.LEFT_TEXT_MARGIN + 5);
        const words = name.split(' ');
        let currentLine = words[0];

        this.ctx.font = `${TreeNode.FONT_SIZE}px Arial`;

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = this.ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                wrappedName.push(currentLine);
                currentLine = word;
            }
        }
        wrappedName.push(currentLine);

        return wrappedName;
    }

    private roundRect() {

        let fillstyle = TreeNode.RECT_FILL_STYLE;
        let lineWidth = TreeNode.RECT_LINE_WIDTH;

        if (this.selected) {
            fillstyle = TreeNode.SELECTED_RECT_FILL_STYLE;
            lineWidth = TreeNode.SELECTED_RECT_LINE_WIDTH;
        }

        if (this.highlighted) {
            fillstyle = TreeNode.HIGHLIGHTED_RECT_FILL_STYLE;
        }

        const radius = TreeNode.RECT_ROUNDED_CORNER_RADIUS;
        const r = this.xRight;
        const b = this.yBottom;
        this.ctx.beginPath();
        this.ctx.strokeStyle = TreeNode.RECT_STROKE_STYLE;
        this.ctx.lineWidth = lineWidth;
        this.ctx.moveTo(this.x + radius, this.y);
        this.ctx.lineTo(r - radius, this.y);
        this.ctx.quadraticCurveTo(r, this.y, r, this.y + radius);
        this.ctx.lineTo(r, this.yBottom - radius);
        this.ctx.quadraticCurveTo(r, b, r - radius, b);
        this.ctx.lineTo(this.x + radius, b);
        this.ctx.quadraticCurveTo(this.x, b, this.x, b - radius);
        this.ctx.lineTo(this.x, this.y + radius);
        this.ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
        this.ctx.stroke();
        this.ctx.fillStyle = fillstyle;
        this.ctx.fill();
    }

    private drawArrow() {

        const point1 = new Point(
            this.xRight + TreeNode.MORE_ARROW_SPACING,
            this.yMid - TreeNode.MORE_ARROW_WIDTH,
        );

        const point2 = new Point(
            point1.x + TreeNode.MORE_ARROW_HEIGHT,
            point1.y + TreeNode.MORE_ARROW_WIDTH,
        );

        const point3 = new Point(
            point1.x,
            point2.y + TreeNode.MORE_ARROW_WIDTH,
        );

        this.ctx.beginPath();
        this.ctx.strokeStyle = TreeNode.RECT_STROKE_STYLE;
        this.ctx.lineWidth = 1;
        this.ctx.moveTo(point1.x, point1.y);
        this.ctx.lineTo(point2.x, point2.y);
        this.ctx.lineTo(point3.x, point3.y);
        this.ctx.lineTo(point1.x, point1.y);
        this.ctx.stroke();
        this.ctx.fillStyle = TreeNode.RECT_STROKE_STYLE;
        this.ctx.fill();


    }
}
