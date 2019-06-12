import Person from './person';
import Relation from './relation';
import TreeNode from './treeNode';
import TreeLevel from './treeLevel';
import store from '../store/store';

export default class Tree {

    public static PARTNERED = 1;
    public static RAISED = 2;

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private nodesById: { [id: string]: TreeNode; };
    private treeLevelsByLevel: { [id: string]: TreeLevel; };
    private descendantFrontierById: { [id: string]: TreeNode; };
    private ancestorFrontierById: { [id: string]: TreeNode; };
    private selectedNode: TreeNode;

    constructor(canvas: HTMLCanvasElement, people: Person[], relations: Relation[]) {
        this.canvas = canvas;

        const ctx  = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No 2d canvas element!');
        }

        this.ctx = ctx;
        this.nodesById = {};
        this.treeLevelsByLevel = {};

        // Create tree node lookup
        for (const person of people) {
            const node = new TreeNode(ctx, person);
            this.nodesById[node.id] = node;
        }

        // Create relation objects
        for (const relation of relations) {
            const fromPerson = this.nodesById[relation.from_person_id];
            const toPerson = this.nodesById[relation.to_person_id];

            if (relation.relation_type === Tree.RAISED) {
                fromPerson.descendants.push(toPerson);
                toPerson.ancestors.push(fromPerson);

            } else { // Partnered
                fromPerson.partners.push(toPerson);
                toPerson.partners.push(fromPerson);
            }
        }

        this.descendantFrontierById = {};
        this.ancestorFrontierById = {};
        this.selectedNode =  this.nodesById[store.state.person_id];
    }

    public render() {

        window.console.log(`Tree.Render()`);
        window.console.log(`Clearing Canvas`);
        this.clearCanvas();

        window.console.log(`Adding selected node`);
        this.addLevel0();

        window.console.log(`Adding ancestors`);
        this.addAncestors();

        window.console.log(`Adding descendants`);
        this.addDescendants();

        window.console.log(`Positioning levels`);
        this.positionLevels();

        window.console.log(`Rendering levels`);
        window.console.log(this.treeLevelsByLevel);

        Object.keys(this.treeLevelsByLevel).forEach((id) => {
            const treeLevel = this.treeLevelsByLevel[id];

            treeLevel.render();
        });
    }

    private clearCanvas() {
        this.treeLevelsByLevel = {};
        this.descendantFrontierById = {};
        this.ancestorFrontierById = {};

        // Store the current transformation matrix
        this.ctx.save();

        // Use the identity matrix while clearing the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Restore the transform
        this.ctx.restore();
    }

    private addLevel0() {

        const level0 = new TreeLevel(this.canvas, this.ctx, 0, 0);
        this.selectedNode =  this.nodesById[store.state.person_id];

        level0.addSelectedNode(this.selectedNode);
        this.treeLevelsByLevel[level0.id] = level0;

        this.descendantFrontierById[this.selectedNode.id] = this.selectedNode;
        this.ancestorFrontierById[this.selectedNode.id] = this.selectedNode;
    }

    private addAncestors() {

        // Add ancestors using a frontier
        let level = -1;
        while (Object.keys(this.ancestorFrontierById).length > 0) {

            window.console.log(`Tree.AddAncestors() level:${level}`);

            const y = (this.selectedNode.y || 0) + level * (TreeNode.HEIGHT + TreeLevel.TREE_LEVEL_SPACING);
            window.console.log(`this.selectedNode.y: ${this.selectedNode.y}`);
            window.console.log(`TreeNode.HEIGHT: ${TreeNode.HEIGHT}`);
            window.console.log(`TreeLevel.TREE_LEVEL_SPACING: ${TreeLevel.TREE_LEVEL_SPACING}`);
            window.console.log(`y: ${y}`);

            const treeLevel = new TreeLevel(this.canvas, this.ctx, level, y);
            let addLevel = false;

            Object.keys(this.ancestorFrontierById).forEach((frontierId) => {
                const frontierPerson = this.nodesById[frontierId];
                const ancestors =  frontierPerson.ancestors;

                for (const ancestor of ancestors) {
                    treeLevel.addNode(ancestor, ancestor.descendants, false);

                    this.ancestorFrontierById[ancestor.id] = ancestor;

                    addLevel = true;
                }

                delete this.ancestorFrontierById[frontierId];
            });

            if (addLevel) {
                this.treeLevelsByLevel[treeLevel.id] = treeLevel;
            }

            level--;
        }
    }


    private addDescendants() {
        let level = 1;
        while (Object.keys(this.descendantFrontierById).length > 0) {

            const y = (this.selectedNode.y || 0) + level * (TreeNode.HEIGHT + TreeLevel.TREE_LEVEL_SPACING);

            const treeLevel = new TreeLevel(this.canvas, this.ctx, level, y);
            let addLevel = false;

            Object.keys(this.descendantFrontierById).forEach((frontierId) => {
                const frontierPerson = this.nodesById[frontierId];
                const descendants =  frontierPerson.descendants;

                for (const descendant of descendants) {

                    treeLevel.addNode(descendant, descendant.ancestors, true);

                    this.descendantFrontierById[descendant.id] = descendant;

                    addLevel = true;
                }

                delete this.descendantFrontierById[frontierId];
            });

            if (addLevel) {
                this.treeLevelsByLevel[treeLevel.id] = treeLevel;
            }

            level++;
        }
    }

    private positionLevels() {
        // Position levels around selected node

        // ancestor Levels
        const ancestorLevels = Object.values(this.treeLevelsByLevel)
                            .filter((item) => item.level < 0)
                            .sort((a, b) => b.level - a. level);

        for (const level of ancestorLevels) {
            level.positionGroups();
        }

        // decendant levels
        const descendantLevels = Object.values(this.treeLevelsByLevel)
                            .filter((item) => item.level > 0)
                            .sort((a, b) => a.level - b. level);

        for (const level of descendantLevels) {
            level.positionGroups();
        }
    }
}
