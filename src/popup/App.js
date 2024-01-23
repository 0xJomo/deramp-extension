import logo from 'url:../images/icon256.png';
import shapes from 'url:../images/shapes.svg';

export const App = () => {
    return (
        <>
            <div>
            <img src={shapes} className="absolute animate-blob2" />
            <h1 className="text-7xl lg:text-9xl font-extrabold">DeRamp</h1>
            <div>v{browser.runtime.getManifest().version}</div>
            </div>
        </>
    );
};
