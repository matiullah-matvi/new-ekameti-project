import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const P2PLanding = () => {
  const navigate = useNavigate();
  const [userKametis, setUserKametis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserKametis();
  }, []);

  const loadUserKametis = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('ekametiUser');
      const user = storedUser ? JSON.parse(storedUser) : null;

      if (!user || !token) {
        navigate('/login');
        return;
      }

      // Fetch all kametis
      const response = await axios.get(getApiUrl('kameti'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allKametis = response.data || [];

      // Fetch user's joined kametis
      let joinedKametis = [];
      try {
        const joinedResponse = await axios.get(getApiUrl(`users/joined-kametis/${user.email}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        joinedKametis = joinedResponse.data.joinedKametis || [];
      } catch (error) {
        console.warn('Could not fetch joined kametis:', error);
      }

      // Filter kametis where user is creator or member
      const userKametis = allKametis.filter(kameti => {
        const isCreator = kameti.createdBy === user._id;
        const isMember = kameti.members?.some(member => 
          member.userId === user._id || member.email === user.email
        );
        const hasJoined = joinedKametis.some(joined => joined.kametiId === kameti.kametiId);
        return isCreator || isMember || hasJoined;
      });

      setUserKametis(userKametis);
    } catch (error) {
      console.error('Error loading kametis:', error);
      setUserKametis([]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Peer-to-Peer Lending</h1>
          <p className="text-gray-600">Request a loan from your kameti members</p>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : userKametis.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Kameti</h2>
            <p className="text-sm text-gray-600 mb-6">
              Choose a kameti to create a loan request. Only members of the same kameti can fund your loan.
            </p>
            <div className="space-y-3">
              {userKametis.map((kameti) => (
                <button
                  key={kameti._id || kameti.kametiId}
                  onClick={() => navigate(`/p2p/create-loan?kametiId=${kameti.kametiId}`)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <div className="font-semibold text-gray-900">{kameti.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{kameti.kametiId}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">You need to be a member of a kameti to request a loan.</p>
            <button
              onClick={() => navigate('/create-kameti')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Create Kameti
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default P2PLanding;

