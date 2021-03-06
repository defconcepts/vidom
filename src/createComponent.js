import noOp from './utils/noOp';
import rafBatch from './client/rafBatch';
import createNode from './createNode';
import console from './utils/console';

const emptyAttrs = {};

function mountComponent() {
    this._isMounted = true;
    this.onMount(this._attrs);
}

function unmountComponent() {
    this._isMounted = false;
    this._domRefs = null;
    this.onUnmount();
}

function patchComponent(attrs, children, parentNode) {
    attrs = this._buildAttrs(attrs);

    let prevRootNode = this._rootNode,
        prevAttrs = this._attrs;

    if(prevAttrs !== attrs) {
        this._attrs = attrs;
        if(this.isMounted()) {
            this._isUpdating = true;
            this.onAttrsReceive(attrs, prevAttrs);
            this._isUpdating = false;
        }
    }

    this._children = children;

    const shouldUpdate = this.shouldUpdate(attrs, prevAttrs);

    if(process.env.NODE_ENV !== 'production') {
        const shouldUpdateResType = typeof shouldUpdate;
        if(shouldUpdateResType !== 'boolean') {
            console.warn(`Warning! Component#shouldUpdate() should return boolean instead of ${shouldUpdateResType}`);
        }
    }

    if(shouldUpdate) {
        this._rootNode = this.render();
        prevRootNode.patch(this._rootNode, parentNode);
        this.isMounted() && this.onUpdate(attrs, prevAttrs);
    }
}

function shouldComponentUpdate(attrs, prevAttrs) {
    return true;
}

function renderComponentToDom(parentNode) {
    return this._rootNode.renderToDom(parentNode);
}

function renderComponentToString(ctx) {
    return this._rootNode.renderToString(ctx);
}

function adoptComponentDom(domNode, parentNode) {
    this._rootNode.adoptDom(domNode, parentNode);
}

function getComponentDomNode() {
    return this._rootNode.getDomNode();
}

function getComponentAttrs() {
    return this._attrs;
}

function renderComponent() {
    this._domRefs = {};

    const renderRes = this.onRender(this._attrs, this._children) || createNode('noscript');

    if(process.env.NODE_ENV !== 'production') {
        if(typeof renderRes !== 'object' || Array.isArray(renderRes)) {
            console.error('Error! Component#onRender must return a single node object on the top level');
        }
    }

    return renderRes;
}

function updateComponent(cb, cbCtx) {
    if(this._isUpdating) {
        cb && rafBatch(() => cb.call(cbCtx || this));
    }
    else {
        this._isUpdating = true;
        rafBatch(() => {
            if(this.isMounted()) {
                this.patch(this._attrs, this._children);
                this._isUpdating = false;
                cb && cb.call(cbCtx || this);
            }
        });
    }
}

function getComponentRootNode() {
    return this._rootNode;
}

function isComponentMounted() {
    return this._isMounted;
}

function setComponentDomRef(ref, node) {
    return this._domRefs[ref] = node;
}

function getComponentDomRef(ref) {
    return this._domRefs[ref]?
        this._domRefs[ref].getDomNode() :
        null;
}

function getComponentDefaultAttrs() {
    return emptyAttrs;
}

function buildComponentAttrs(attrs) {
    if(this._attrs && (attrs === this._attrs)) {
        return attrs;
    }

    const cons = this.constructor,
        defaultAttrs = cons._defaultAttrs || (cons._defaultAttrs = cons.getDefaultAttrs());

    if(!attrs) {
        return defaultAttrs;
    }

    if(defaultAttrs === emptyAttrs) {
        return attrs;
    }

    const res = {};

    for(let i in defaultAttrs) {
        res[i] = defaultAttrs[i];
    }

    for(let i in attrs) {
        res[i] = attrs[i];
    }

    return res;
}

function createComponent(props, staticProps) {
    const res = function(attrs, children) {
            this._attrs = this._buildAttrs(attrs);
            this._children = children;
            this._domRefs = null;
            this._isMounted = false;
            this._isUpdating = false;
            this.onInit(this._attrs);
            this._rootNode = this.render();
        },
        ptp = {
            constructor : res,
            onInit : noOp,
            mount : mountComponent,
            unmount : unmountComponent,
            onMount : noOp,
            onUnmount : noOp,
            onAttrsReceive : noOp,
            shouldUpdate : shouldComponentUpdate,
            onUpdate : noOp,
            isMounted : isComponentMounted,
            renderToDom : renderComponentToDom,
            renderToString : renderComponentToString,
            adoptDom : adoptComponentDom,
            getDomNode : getComponentDomNode,
            getRootNode : getComponentRootNode,
            render : renderComponent,
            onRender : noOp,
            update : updateComponent,
            patch : patchComponent,
            getDomRef : getComponentDomRef,
            setDomRef : setComponentDomRef,
            getAttrs : getComponentAttrs,
            _buildAttrs : buildComponentAttrs
        };

    for(let i in props) {
        ptp[i] = props[i];
    }

    res.prototype = ptp;

    res.getDefaultAttrs = getComponentDefaultAttrs;

    for(let i in staticProps) {
        res[i] = staticProps[i];
    }

    return res;
}

export default createComponent;
