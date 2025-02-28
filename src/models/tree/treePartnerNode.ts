import TreeNode from './treeNode';
import Positionable from './positionable';
import TreeRelation from './treeRelation';
import PartneredRelation from './partneredRelation';
import TreeNodeGroup from './treeNodeGroup';

// Represents a group of people who are partners in the family tree

export default class TreePartnerNode extends Positionable {

    public static MIN_SPACING = 15;

    public id: string;
    public ctx: CanvasRenderingContext2D;
    public mainNode: TreeNode;
    public partners: TreeNode[];
    public nodes: TreeNode[];
    public relations: TreeRelation[];
    public parent: TreeNodeGroup;

    constructor(ctx: CanvasRenderingContext2D, mainNode: TreeNode, parent: TreeNodeGroup) {

        // // window.console.log(`TreePartnerNode.constructor()`);

        const width = (mainNode.partners.length + 1) * TreeNode.WIDTH
                        + (mainNode.partners.length) * TreeNode.MIN_SPACING;

        super(width, TreeNode.HEIGHT, TreePartnerNode.MIN_SPACING);

        this.id = mainNode.id;
        this.ctx = ctx;
        this.mainNode = mainNode;
        this.partners = mainNode.partners;
        this.spacing = TreePartnerNode.MIN_SPACING;
        this.relations = [];

        this.nodes = [];
        this.nodes.push(mainNode);
        this.parent = parent;

        mainNode.addToTree = true;
        mainNode.parent = this;

        let xLeft = mainNode.rightMarginEnd;

        for (const partnerNode of this.partners) {
            partnerNode.addToTree = true;
            this.nodes.push(partnerNode);
            partnerNode.parent = this;

            if (mainNode.hasXValue) {
                partnerNode.setXYPosition(xLeft + partnerNode.spacing, mainNode.y);
                xLeft = partnerNode.rightMarginEnd;
            }

            const relation = new PartneredRelation(ctx, mainNode, partnerNode);
            this.relations.push(relation);
        }

        if (mainNode.hasXValue) {
            this.updateWidth();
            this.setXYPosition(mainNode.leftMarginStart, mainNode.y);
        }
    }

    public setContentPosition(x: number, y: number) {
        this.mainNode.setXYPosition(x, y);

        let nextNodeX = this.mainNode.rightMarginEnd;

        for (const partner of this.partners) {
            partner.setXYPosition(nextNodeX + partner.spacing, y);
            nextNodeX = partner.rightMarginEnd;
        }

        this.setXYPosition(this.mainNode.leftMarginStart, y);
    }

    public setPosition(xLeftMargin: number, y: number) {

        const x = xLeftMargin + this.spacing + this.mainNode.spacing;

        this.setContentPosition(x, y);
    }

    public updateWidth(nodeSpacingChange = 0) {

        this.mainNode.updateSpacing(this.mainNode.spacing + nodeSpacingChange);

        let width = this.mainNode.widthAndSpacing;

        for (const partner of this.partners) {
            partner.updateSpacing(partner.spacing + nodeSpacingChange);
            width += partner.widthAndSpacing;
        }

        this.width = width;
        this.widthAndSpacing = this.width + this.spacing * 2;
    }

    public setDisabled(disabled: boolean) {

        this.disabled = disabled;
        this.mainNode.setDisabled(disabled);

        for (const partner of this.partners) {
            partner.setDisabled(disabled);
        }

        for (const relation of this.relations) {
            relation.disabled = disabled;
        }
    }

    public render() {
        this.mainNode.render();

        for (const partner of this.partners) {
            partner.render();
        }

        for (const relation of this.relations) {
            relation.render();
        }

        // this.showBordersForDebugging(this.ctx);
    }

    public clearRenderValues(clearAll = true) {

        this.mainNode.clearRenderValues(clearAll);
        for (const partner of this.partners) {
            partner.clearRenderValues(clearAll);
        }

        if (clearAll) {
            this.spacing = TreePartnerNode.MIN_SPACING;
            this.relations = [];
            this.nodes = [];
        }
    }
}
