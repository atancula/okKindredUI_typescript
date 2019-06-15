import Person from './person';
import Relation from './relation';
import TreeNode from './treeNode';
import TreeLevel from './treeLevel';
import store from '../store/store';
import TreeRelation from './treeRelation';
import RaisedRelation from './raisedRelation';

export default class Tree {

    public static PARTNERED = 1;
    public static RAISED = 2;

    public raisedRelationsById: { [id: string]: TreeRelation; };

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private nodesById: { [id: string]: TreeNode; };
    private treeLevelsByLevel: { [id: string]: TreeLevel; };
    private descendantFrontierById: { [id: string]: TreeNode; };
    private ancestorFrontierById: { [id: string]: TreeNode; };
    private selectedNode: TreeNode;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, people: Person[], relations: Relation[]) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.nodesById = {};
        this.treeLevelsByLevel = {};
        this.raisedRelationsById = {};

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
        this.selectedNode.selected = true;
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

        // window.console.log(`Positioning Ancestor levels`);
        this.positionAncestorLevels();

        window.console.log(`Positioning Descendant levels`);
        this.positionDescendantLevels();

        window.console.log(`Rendering levels`);
        window.console.log(this.treeLevelsByLevel);

        Object.values(this.treeLevelsByLevel).forEach((treeLevel) => {
            treeLevel.render();
        });

        Object.values(this.raisedRelationsById).forEach((relation) => {
            relation.render();
        });
    }

    public click(x: number, y: number) {
        window.console.log(`Tree.click(x:${x} , y:${y})`);

        for (const node of this.getDrawnNodes()) {
            if (node.hasXValue && node.hasYValue) {
                if (Math.abs(node.x - x) < TreeNode.WIDTH
                        && Math.abs(node.y - y) < TreeNode.HEIGHT) {

                    this.changeSelectedPerson(node.id.toString()).then(() => {
                        this.render();
                    });

                    return;
                }
            }
        }
    }

    private changeSelectedPerson(newPersonId: string) {
        return new Promise((resolve) => {
            // Get old selected id
            const oldSelectedId = store.state.person_id;

            if (oldSelectedId !== newPersonId) {
                this.nodesById[oldSelectedId].selected = false;
                store.dispatch('changePerson', newPersonId).then(() => {
                    this.nodesById[newPersonId].selected = true;
                    resolve();
                });

            }
        });

    }

    private getDrawnNodes(): TreeNode[] {

        const result = new Array<TreeNode>();

        Object.values(this.treeLevelsByLevel).forEach((level) => {
            for (const group of level.groups) {
                for (const partner of group.partnerNodes) {
                    for (const node of partner.nodes) {
                        result.push(node);
                    }
                }
            }
        });

        return result;
    }

    private clearCanvas() {

        Object.values(this.treeLevelsByLevel).forEach((treeLevel) => {
            treeLevel.clearRenderValues();
        });

        this.treeLevelsByLevel = {};
        this.descendantFrontierById = {};
        this.ancestorFrontierById = {};
        this.raisedRelationsById = {};

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
        this.createRelations(this.selectedNode);
        this.treeLevelsByLevel[level0.id] = level0;

        this.descendantFrontierById[this.selectedNode.id] = this.selectedNode;
        this.ancestorFrontierById[this.selectedNode.id] = this.selectedNode;
    }

    private addAncestors() {

        // Add ancestors using a frontier
        let level = -1;
        while (Object.keys(this.ancestorFrontierById).length > 0) {

            window.console.log(`Tree.AddAncestors() level:${level}`);

            const y = (this.selectedNode.y) + level * (TreeNode.HEIGHT + TreeLevel.TREE_LEVEL_SPACING);
            const treeLevel = new TreeLevel(this.canvas, this.ctx, level, y);
            let addLevel = false;

            Object.values(this.ancestorFrontierById).forEach((frontierPerson) => {
                const ancestors =  frontierPerson.ancestors;

                for (const ancestor of ancestors) {

                    this.ancestorFrontierById[ancestor.id] = ancestor;

                    addLevel = true;

                    if (ancestor.addToTree === false) {
                        treeLevel.addNode(ancestor, ancestor.descendants, false);
                    }

                    this.createRelations(ancestor);
                }

                delete this.ancestorFrontierById[frontierPerson.id];
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

            const y = (this.selectedNode.y) + level * (TreeNode.HEIGHT + TreeLevel.TREE_LEVEL_SPACING);

            const treeLevel = new TreeLevel(this.canvas, this.ctx, level, y);
            let addLevel = false;

            Object.values(this.descendantFrontierById).forEach((frontierPerson) => {
                const descendants =  frontierPerson.descendants;

                for (const descendant of descendants) {

                    this.descendantFrontierById[descendant.id] = descendant;
                    addLevel = true;

                    if (descendant.addToTree === false) {
                        treeLevel.addNode(descendant, descendant.ancestors, true);
                    }

                    this.createRelations(descendant);
                }

                delete this.descendantFrontierById[frontierPerson.id];
            });

            if (addLevel) {
                this.treeLevelsByLevel[treeLevel.id] = treeLevel;
            }

            level++;
        }
    }

    private createRelations(treeNode: TreeNode) {
        if (treeNode.ancestors.length > 0) {
            const relation = new RaisedRelation(this.ctx, treeNode.ancestors, treeNode);

            if (!this.raisedRelationsById[relation.id]) {
                this.raisedRelationsById[relation.id] = relation;
            }
        }
    }

    private positionDescendantLevels() {
        // decendant levels
        const descendantLevels = Object.values(this.treeLevelsByLevel)
                            .filter((item) => item.level > 0)
                            .sort((a, b) => a.level - b. level);
        // Levels that have beened positioned
        const positionedLevels = new Array<TreeLevel>();
        positionedLevels.push(this.treeLevelsByLevel['0']);

        for (const level of descendantLevels) {
            level.positionDescendantGroups(0, 0);

            positionedLevels.unshift(level);

            const levelsToReposition = new Array<TreeLevel>();

            // if there is an overlap, we have to reposition previous level
            // then check for overlaps on further down
            for (const previousLevel of positionedLevels) {

                levelsToReposition.unshift(previousLevel);
                const maxOverlap = previousLevel.getLargestOverlap();
                if (maxOverlap > 0) {
                    const levelAbove = this.treeLevelsByLevel[(previousLevel.level - 1).toString()];
                    levelAbove.positionDescendantGroups(0, Math.min(maxOverlap, 800));

                    for (const levelToReposition of levelsToReposition) {
                        levelToReposition.positionDescendantGroups(0, 0);
                    }
                }

            }
        }
    }

    private positionAncestorLevels() {

        // ancestor Levels
        const ancestorLevelsGoingUp = Object.values(this.treeLevelsByLevel)
                            .filter((item) => item.level < 0)
                            .sort((a, b) => b.level - a. level);

        // Levels that have beened positioned
        const positionedLevels = new Array<TreeLevel>();
        positionedLevels.push(this.treeLevelsByLevel['0']);

        for (const level of ancestorLevelsGoingUp) {
            level.positionAncestorGroups(0, 0);
            positionedLevels.unshift(level);

            const levelsToReposition = new Array<TreeLevel>();

            // if there is an overlap, we have to reposition previous level
            // then check for overlaps on further down
            for (const previousLevel of positionedLevels) {

                levelsToReposition.unshift(previousLevel);
                const maxOverlap = previousLevel.getLargestOverlap();
                if (maxOverlap > 0) {
                    const levelBelow = this.treeLevelsByLevel[(previousLevel.level + 1).toString()];
                    levelBelow.positionAncestorGroups(0, maxOverlap);

                    for (const levelToReposition of levelsToReposition) {
                        levelToReposition.positionAncestorGroups(0, 0);
                    }
                }

            }

        }
    }

}
