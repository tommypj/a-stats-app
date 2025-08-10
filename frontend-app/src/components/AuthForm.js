import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext.js';
import { Button, Input, Card, Alert } from './index.js';

const AuthForm = () => {
    const { state, handleLogin, handleRegister, handleGoogleLogin } = useAppContext();
    const { loading, authError } = state;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLoginClick = () => handleLogin(email, password);
    const handleRegisterClick = () => handleRegister(email, password);

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
            <Card className="w-full max-w-md p-8">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Login or Register</h2>
                {authError && <Alert type="error" className="mb-4">{authError}</Alert>}
                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3" />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4" />
                <Button onClick={handleLoginClick} disabled={loading} className="w-full mb-3">{loading ? 'Logging in...' : 'Login'}</Button>
                <p className="text-center text-gray-500 my-4">or</p>
                <Button onClick={handleGoogleLogin} disabled={loading} className="w-full mb-3 bg-red-600 hover:bg-red-700">Login with Google</Button>
                <Button onClick={handleRegisterClick} disabled={loading} className="w-full mt-4 bg-gray-600 hover:bg-gray-700">Register</Button>
            </Card>
        </div>
    );
};

export default AuthForm;
