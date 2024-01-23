import logo from 'url:../images/icon256.png';


export const App = () => {
    return (
        <>
            <img src={logo} alt="Logo"/>
            <h1>Deramp</h1>
            <div>v{browser.runtime.getManifest().version}</div>
        </>
    );
};
